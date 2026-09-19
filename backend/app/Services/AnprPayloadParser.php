<?php
namespace App\Services;

use App\Core\Database;
use App\Helpers\TimezoneHelper;
use Throwable;

class AnprPayloadParser {
    /**
     * Default manufacturer field mapping presets
     */
    public const PRESETS = [
        'dahua' => [
            'vendor_name'   => 'Dahua Technology (ITC Series / Traffic ANPR)',
            'field_plate'   => 'PlateNumber',
            'field_gate'    => 'Channel',
            'field_lane'    => 'Lane',
            'field_time'    => 'TimeStamp',
            'field_type'    => 'VehicleType',
            'field_color'   => 'VehicleColor',
            'field_image'   => 'Image',
            'channel_entry' => '1',
            'channel_exit'  => '2',
            'sample_payload'=> [
                'PlateNumber'  => 'BHR 99887',
                'PlateColor'   => 'Blue',
                'VehicleColor' => 'White',
                'VehicleType'  => 'Sedan',
                'TimeStamp'    => '2026-09-10 12:40:00',
                'Channel'      => 1,
                'Lane'         => 1,
                'SnapPicURL'   => '',
                'Image'        => ''
            ]
        ],
        'hikvision' => [
            'vendor_name'   => 'Hikvision (Smart LPR / DS-2CD Series)',
            'field_plate'   => 'licensePlate',
            'field_gate'    => 'laneNo',
            'field_lane'    => 'laneNo',
            'field_time'    => 'dateTime',
            'field_type'    => 'vehicleType',
            'field_color'   => 'vehicleColor',
            'field_image'   => 'picture',
            'channel_entry' => '1',
            'channel_exit'  => '2',
            'sample_payload'=> [
                'licensePlate' => 'BHR 11223',
                'laneNo'       => 1,
                'dateTime'     => '2026-09-10 12:40:00',
                'vehicleType'  => 'Car',
                'vehicleColor' => 'Silver',
                'picture'      => ''
            ]
        ],
        'uniview' => [
            'vendor_name'   => 'Uniview (UNV Toll & Parking LPR)',
            'field_plate'   => 'PlateText',
            'field_gate'    => 'ChannelID',
            'field_lane'    => 'TollGateID',
            'field_time'    => 'PassTime',
            'field_type'    => 'CarType',
            'field_color'   => 'PlateColor',
            'field_image'   => 'ImageURL',
            'channel_entry' => '1',
            'channel_exit'  => '2',
            'sample_payload'=> [
                'PlateText'    => 'BHR 43212',
                'ChannelID'    => 1,
                'PassTime'     => '2026-09-10 12:40:00',
                'CarType'      => 'SUV',
                'PlateColor'   => 'White',
                'ImageURL'     => ''
            ]
        ],
        'generic' => [
            'vendor_name'   => 'Generic / Standard Webhook (HTTP JSON)',
            'field_plate'   => 'plate_number',
            'field_gate'    => 'gate_code',
            'field_lane'    => 'lane_number',
            'field_time'    => 'timestamp',
            'field_type'    => 'vehicle_type',
            'field_color'   => 'vehicle_color',
            'field_image'   => 'image_base64',
            'channel_entry' => 'GATE-IN-01',
            'channel_exit'  => 'GATE-OUT-01',
            'sample_payload'=> [
                'camera_id'    => 'ANPR-ENTRY-CAM-01',
                'plate_number' => 'BHR 11223',
                'gate_code'    => 'GATE-IN-01',
                'direction'    => 'ENTRY',
                'confidence'   => 98.5,
                'vehicle_type' => 'car',
                'image_base64' => '',
                'timestamp'    => '2026-09-10 12:40:00'
            ]
        ]
    ];

    /**
     * Retrieve active mapping configuration from database settings
     */
    public static function getMappingConfig(): array {
        $db = Database::getInstance();
        $stmt = $db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'anpr_%'");
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        $preset = $settings['anpr_manufacturer_preset'] ?? 'auto';
        $presetDef = self::PRESETS[$preset] ?? self::PRESETS['dahua'];

        $defaultFolder = 'storage/uploads/anpr_snapshots';
        $projectRoot = realpath(__DIR__ . '/../../');
        $absDefaultFolder = $projectRoot ? ($projectRoot . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'anpr_snapshots') : '';

        return [
            'preset'             => $preset,
            'field_plate'        => $settings['anpr_field_plate'] ?? $presetDef['field_plate'],
            'field_gate'         => $settings['anpr_field_gate'] ?? $presetDef['field_gate'],
            'field_lane'         => $settings['anpr_field_lane'] ?? $presetDef['field_lane'],
            'field_time'         => $settings['anpr_field_time'] ?? $presetDef['field_time'],
            'field_type'         => $settings['anpr_field_type'] ?? $presetDef['field_type'],
            'field_color'        => $settings['anpr_field_color'] ?? $presetDef['field_color'],
            'field_image'        => $settings['anpr_field_image'] ?? $presetDef['field_image'],
            'channel_entry'      => $settings['anpr_channel_entry'] ?? $presetDef['channel_entry'],
            'channel_exit'       => $settings['anpr_channel_exit'] ?? $presetDef['channel_exit'],
            'image_folder_path'  => $settings['anpr_image_folder_path'] ?? $defaultFolder,
            'resolved_abs_path'  => $absDefaultFolder
        ];
    }

    /**
     * Parse incoming ANPR webhook payload supporting multi-vendor formats
     */
    public static function parse(string $rawBody, array $postData = [], array $filesData = []): array {
        TimezoneHelper::init();
        $mapping = self::getMappingConfig();

        // 1. Decode JSON, XML, or use POST array & multipart files
        $data = json_decode($rawBody, true);
        if (!is_array($data) || empty($data)) {
            if (str_contains($rawBody, '<') && str_contains($rawBody, '>')) {
                try {
                    $cleanXml = preg_replace('/xmlns[^=]*="[^"]*"/i', '', $rawBody);
                    $xmlObj = @simplexml_load_string($cleanXml, 'SimpleXMLElement', LIBXML_NOCDATA);
                    if ($xmlObj !== false) {
                        $data = json_decode(json_encode($xmlObj), true);
                    }
                } catch (\Throwable $e) {}
            }
        }
        if (!is_array($data) || empty($data)) {
            $data = $postData;
            // Check if any POST field contains a JSON string (e.g. $_POST['json'] or $_POST['record'])
            foreach ($postData as $k => $val) {
                if (is_string($val) && (str_starts_with(trim($val), '{') || str_starts_with(trim($val), '['))) {
                    $decoded = json_decode($val, true);
                    if (is_array($decoded)) {
                        $data = array_merge($data, $decoded);
                    }
                }
            }
        }

        // Check if JSON payload was uploaded as a file attachment in multipart/form-data
        if ((!is_array($data) || empty($data)) && !empty($filesData)) {
            foreach ($filesData as $f) {
                if (isset($f['tmp_name']) && is_uploaded_file($f['tmp_name'])) {
                    $fContent = @file_get_contents($f['tmp_name']);
                    if ($fContent && (str_starts_with(trim($fContent), '{') || str_starts_with(trim($fContent), '<'))) {
                        $decoded = json_decode($fContent, true);
                        if (is_array($decoded)) {
                            $data = $decoded;
                            $rawBody = $fContent;
                            break;
                        }
                    }
                }
            }
        }

        if (!is_array($data)) {
            $data = [];
        }

        // 2. Extract Plate Number (Mapping -> Candidate keys -> Recursive Search -> Raw XML/JSON regex)
        $plate = self::extractPlateNumber($data, $mapping['field_plate'], $rawBody);

        // 3. Extract Gate / Channel / Lane & match with gates_and_cameras
        $gateRaw = self::getNestedValue($data, $mapping['field_gate']) 
                ?? self::getNestedValue($data, $mapping['field_lane'])
                ?? self::extractGateFallback($data);

        // Map Channel 1 / 2 to GATE-IN-01 / GATE-OUT-01 if configured
        $gateId = self::resolveGateId($gateRaw, $mapping);

        // 4. Direction Resolution
        $direction = self::resolveDirection($data, $gateId, $gateRaw, $mapping);

        // 5. Camera ID
        $cameraId = (string)(
            self::getNestedValue($data, 'camera_id') 
            ?? self::getNestedValue($data, 'DeviceId') 
            ?? self::getNestedValue($data, 'deviceId') 
            ?? self::getNestedValue($data, 'deviceNo') 
            ?? self::getNestedValue($data, 'CameraID')
            ?? self::getNestedValue($data, 'deviceName')
            ?? self::getNestedValue($data, 'params.deviceName')
            ?? ($direction === 'ENTRY' ? 'ANPR-ENTRY-CAM-01' : 'ANPR-EXIT-CAM-01')
        );

        // 6. Confidence Score
        $confidence = (float)(
            self::getNestedValue($data, 'confidence') 
            ?? self::getNestedValue($data, 'Confidence') 
            ?? self::getNestedValue($data, 'RecognitionConfidence')
            ?? self::getNestedValue($data, 'params.passingRecord.confidence')
            ?? self::getNestedValue($data, 'passingRecord.confidence')
            ?? 98.50
        );

        // 7. Vehicle Type & Color
        $vehicleType = (string)(
            self::getNestedValue($data, $mapping['field_type']) 
            ?? self::getNestedValue($data, 'VehicleType') 
            ?? self::getNestedValue($data, 'vehicle_type') 
            ?? self::getNestedValue($data, 'CarType') 
            ?? self::getNestedValue($data, 'carType')
            ?? self::getNestedValue($data, 'params.passingRecord.carType')
            ?? self::getNestedValue($data, 'params.passingRecord.vehicleType')
            ?? 'car'
        );

        $vehicleColor = (string)(
            self::getNestedValue($data, $mapping['field_color']) 
            ?? self::getNestedValue($data, 'VehicleColor') 
            ?? self::getNestedValue($data, 'vehicleColor')
            ?? self::getNestedValue($data, 'PlateColor') 
            ?? self::getNestedValue($data, 'plateColor')
            ?? self::getNestedValue($data, 'params.passingRecord.plateColor')
            ?? self::getNestedValue($data, 'params.passingRecord.vehicleColor')
            ?? ''
        );

        // 8. Timestamp
        $timestamp = self::resolveTimestamp($data, $mapping['field_time']);

        // 9. Store Snapshot Image in Configured Folder Path
        $imagePath = self::processSnapshotImage($data, $filesData, $mapping, $plate, $direction);

        return [
            'plate_number'    => $plate,
            'gate_id'         => $gateId,
            'direction'       => $direction,
            'camera_id'       => $cameraId,
            'confidence'      => $confidence,
            'vehicle_type'    => $vehicleType,
            'vehicle_color'   => $vehicleColor,
            'timestamp'       => $timestamp,
            'image_url'       => $imagePath,
            'clip_url'        => (string)(self::getNestedValue($data, 'clip_url') ?? self::getNestedValue($data, 'clip') ?? ''),
            'raw_payload'     => $rawBody ?: json_encode($data)
        ];
    }

    /**
     * Test mapping against a sample payload without DB insert
     */
    public static function testMapping(array $sampleData, array $customMapping = []): array {
        $mapping = array_merge(self::getMappingConfig(), $customMapping);

        $plate = self::extractPlateNumber($sampleData, $mapping['field_plate'] ?? '');
        $gateRaw = self::getNestedValue($sampleData, $mapping['field_gate'] ?? '') 
                ?? self::getNestedValue($sampleData, $mapping['field_lane'] ?? '')
                ?? self::extractGateFallback($sampleData);
        $gateId = self::resolveGateId($gateRaw, $mapping);
        $direction = self::resolveDirection($sampleData, $gateId, $gateRaw, $mapping);

        $type = self::getNestedValue($sampleData, $mapping['field_type'] ?? '') ?? 'car';
        $color = self::getNestedValue($sampleData, $mapping['field_color'] ?? '') ?? '';
        $time = self::resolveTimestamp($sampleData, $mapping['field_time'] ?? '');

        // Check if image data is present
        $imgField = $mapping['field_image'] ?? 'Image';
        $imgRaw = self::getNestedValue($sampleData, $imgField)
               ?? self::getNestedValue($sampleData, 'Image')
               ?? self::getNestedValue($sampleData, 'SnapPicURL')
               ?? self::getNestedValue($sampleData, 'picture')
               ?? self::getNestedValue($sampleData, 'picData')
               ?? self::getNestedValue($sampleData, 'params.passingRecord.picInfo.0.picData');
        $hasImage = !empty($imgRaw);
        $imageType = 'none';
        if ($hasImage) {
            if (str_starts_with((string)$imgRaw, 'http')) $imageType = 'http_url';
            elseif (str_starts_with((string)$imgRaw, 'data:image') || strlen((string)$imgRaw) > 100) $imageType = 'base64_data';
            else $imageType = 'filename_or_path';
        }

        return [
            'success'        => !empty($plate),
            'plate_number'   => $plate,
            'gate_id'        => $gateId,
            'direction'      => $direction,
            'vehicle_type'   => $type,
            'vehicle_color'  => $color,
            'timestamp'      => $time,
            'has_image'      => $hasImage,
            'image_type'     => $imageType,
            'mapping_applied'=> $mapping
        ];
    }

    /**
     * Extract plate number with smart priority
     */
    private static function extractPlateNumber(array $data, string $configuredKey = '', string $rawBody = ''): string {
        // 1. Check configured key
        if ($configuredKey) {
            $val = self::getNestedValue($data, $configuredKey);
            if ($val !== null && is_scalar($val) && trim((string)$val) !== '') {
                $clean = strtoupper(trim((string)$val));
                if (strlen($clean) >= 2 && $clean !== 'NO_PLATE' && $clean !== 'NULL') {
                    return $clean;
                }
            }
        }

        // 2. Check Dahua / Hikvision / Uniview common fields
        $candidateKeys = [
            'PlateText',
            'PlateNumber',
            'plateNumber',
            'plateText',
            'plate_number',
            'plate_text',
            'licensePlate',
            'LicensePlate',
            'PlateNo',
            'plateNo',
            'Plate',
            'plate',
            'params.PlateText',
            'params.plateText',
            'params.PlateNumber',
            'params.plateNumber',
            'params.PlateNo',
            'params.plateNo',
            'params.carPlate',
            'params.licensePlate',
            'params.passingRecord.PlateText',
            'params.passingRecord.plateText',
            'params.passingRecord.PlateNumber',
            'params.passingRecord.plateNumber',
            'params.passingRecord.PlateNo',
            'params.passingRecord.plateNo',
            'params.passingRecord.licensePlate',
            'PassingRecord.PlateText',
            'PassingRecord.PlateNo',
            'PassingRecord.PlateNumber',
            'PassingRecord.plateText',
            'PassingRecord.plateNumber',
            'passingRecord.PlateText',
            'passingRecord.plateText',
            'passingRecord.PlateNumber',
            'passingRecord.plateNumber',
            'passingRecord.plateNo',
            'passing_record.plate_number',
            'data.PlateText',
            'data.plateText',
            'data.PlateNumber',
            'data.plateNumber',
            'data.PassingRecord.PlateText',
            'PlateInfo.PlateText',
            'PlateInfo.PlateNumber',
            'PlateInfo.PlateNo',
            'PlateResult.PlateNumber',
            'PlateResult.PlateText',
            'PlateResult.license',
            'PlateResult.plateNumber',
            'AlarmInfoPlate.result.PlateResult.license',
            'AlarmInfoPlate.result.PlateResult.plateNumber',
            'TrafficCar.PlateNumber',
            'PictureInfo.0.PlateNumber',
            'MotorVehicleListObject.MotorVehicleObject.0.PlateNo',
            'MotorVehicleListObject.MotorVehicleObject.PlateNo',
            'MotorVehicleListObject.MotorVehicleObject.0.PlateNumber',
            'MotorVehicleListObject.MotorVehicleObject.PlateNumber',
            'MotorVehicleObjectList.MotorVehicleObject.0.PlateNo',
            'MotorVehicleObjectList.MotorVehicleObject.PlateNo',
            'MotorVehicleList.MotorVehicle.0.PlateNo',
            'MotorVehicleList.MotorVehicle.PlateNo',
            'MotorVehicleObject.0.PlateNo',
            'MotorVehicleObject.PlateNo',
            'PlateAttributeInfo.PlateNo',
            'VehicleInfoList.0.PlateAttributeInfo.PlateNo',
            'VehicleInfo.PlateAttributeInfo.PlateNo',
            'PlateAttr.PlateNo',
            'license_plate',
            'car_number'
        ];

        foreach ($candidateKeys as $k) {
            $val = self::getNestedValue($data, $k);
            if ($val !== null && is_scalar($val) && trim((string)$val) !== '') {
                $clean = strtoupper(trim((string)$val));
                if (strlen($clean) >= 2 && $clean !== 'NO_PLATE' && $clean !== 'NULL' && $clean !== 'UNKNOWN') {
                    return $clean;
                }
            }
        }

        // 3. Recursive key search in decoded structure
        if (!empty($data)) {
            $found = self::findPlateRecursive($data);
            if ($found) {
                return $found;
            }
        }

        // 4. Fallback regex on raw body (e.g. UNV XML <Name>Plate Number</Name><Value>347370</Value>)
        if (!empty($rawBody)) {
            if (preg_match('/<Name>Plate\s*Number<\/Name>\s*<Value>([^<]+)<\/Value>/i', $rawBody, $m)) {
                return strtoupper(trim($m[1]));
            }
            if (preg_match('/<(?:PlateNumber|PlateText|PlateNo|licensePlate|Plate|plate_number|CarPlate)>([^<]+)<\/(?:PlateNumber|PlateText|PlateNo|licensePlate|Plate|plate_number|CarPlate)>/i', $rawBody, $m)) {
                return strtoupper(trim($m[1]));
            }
            if (preg_match('/"(?:PlateText|plateText|PlateNumber|plateNumber|PlateNo|plateNo|licensePlate|plate_number|carPlate)"\s*:\s*"([^"]+)"/i', $rawBody, $m)) {
                return strtoupper(trim($m[1]));
            }
        }

        return '';
    }

    /**
     * Recursively search for plate keys in arbitrary JSON/array payloads
     */
    private static function findPlateRecursive(array $arr, int $depth = 0): ?string {
        if ($depth > 8) return null;
        foreach ($arr as $key => $val) {
            $kLower = strtolower((string)$key);
            if (is_scalar($val) && (
                str_contains($kLower, 'plate') ||
                str_contains($kLower, 'license') ||
                str_contains($kLower, 'carnum') ||
                str_contains($kLower, 'vehicle_no')
            )) {
                $str = strtoupper(trim((string)$val));
                // Ensure it's not a boolean/color/type or generic word
                if (strlen($str) >= 2 && strlen($str) <= 25 && 
                    !in_array($str, ['TRUE', 'FALSE', 'NULL', 'BLUE', 'WHITE', 'YELLOW', 'GREEN', 'BLACK', 'CAR', 'SUV', 'SEDAN', 'TRUCK', 'BUS', 'UNKNOWN', 'NO_PLATE', '0', '1', '2'])) {
                    return $str;
                }
            }
            if (is_array($val)) {
                $nested = self::findPlateRecursive($val, $depth + 1);
                if ($nested) return $nested;
            }
        }
        return null;
    }

    /**
     * Resolve Gate ID from channel, lane, or client IP
     */
    private static function resolveGateId($gateRaw, array $mapping): string {
        $val = trim((string)$gateRaw);

        // Check channel entry/exit mapping
        if ($val === (string)$mapping['channel_entry'] || $val === '1') {
            return 'GATE-IN-01';
        }
        if ($val === (string)$mapping['channel_exit'] || $val === '2') {
            return 'GATE-OUT-01';
        }

        if ($val && $val !== 'GATE-IN-01' && $val !== 'GATE-OUT-01') {
            return $val;
        }

        // Check database gates by camera IP
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($clientIp && $clientIp !== '127.0.0.1') {
            try {
                $db = Database::getInstance();
                $stmt = $db->prepare("SELECT gate_code FROM gates_and_cameras WHERE camera_ip = ? LIMIT 1");
                $stmt->execute([$clientIp]);
                $gateRow = $stmt->fetch();
                if ($gateRow && !empty($gateRow['gate_code'])) {
                    return $gateRow['gate_code'];
                }
            } catch (\Throwable $e) {}
        }

        return 'GATE-IN-01';
    }

    /**
     * Resolve Direction (ENTRY vs EXIT)
     */
    private static function resolveDirection(array $data, string $gateId, $gateRaw, array $mapping): string {
        // Explicit direction key
        $explicit = self::getNestedValue($data, 'direction') 
                 ?? self::getNestedValue($data, 'Direction') 
                 ?? self::getNestedValue($data, 'PassDirection')
                 ?? self::getNestedValue($data, 'passDirection')
                 ?? self::getNestedValue($data, 'params.passingRecord.direction')
                 ?? self::getNestedValue($data, 'passingRecord.direction');

        if ($explicit !== null && $explicit !== '') {
            $dir = strtoupper(trim((string)$explicit));
            if ($dir === 'IN' || $dir === 'ENTRY' || $dir === '1') return 'ENTRY';
            if ($dir === 'OUT' || $dir === 'EXIT' || $dir === '2') return 'EXIT';
        }

        // Check channel mapping
        if ((string)$gateRaw === (string)$mapping['channel_exit']) {
            return 'EXIT';
        }
        if ((string)$gateRaw === (string)$mapping['channel_entry']) {
            return 'ENTRY';
        }

        // Check Gate ID name
        if (stripos($gateId, 'OUT') !== false || stripos($gateId, 'EXIT') !== false) {
            return 'EXIT';
        }

        // Check database gate type for resolved Gate ID
        if ($gateId) {
            try {
                $db = Database::getInstance();
                $stmt = $db->prepare("SELECT gate_type FROM gates_and_cameras WHERE gate_code = ? LIMIT 1");
                $stmt->execute([$gateId]);
                $gateRow = $stmt->fetch();
                if ($gateRow && !empty($gateRow['gate_type'])) {
                    return strtoupper($gateRow['gate_type']) === 'EXIT' ? 'EXIT' : 'ENTRY';
                }
            } catch (\Throwable $e) {}
        }

        return 'ENTRY';
    }

    /**
     * Resolve event timestamp
     */
    private static function resolveTimestamp(array $data, string $timeKey = ''): string {
        $keys = array_filter([
            $timeKey,
            'TimeStamp',
            'UTC',
            'Time',
            'dateTime',
            'captureTime',
            'PassTime',
            'passTime',
            'timestamp',
            'date_time',
            'datetime',
            'params.passingRecord.passTime',
            'passingRecord.passTime'
        ]);

        foreach ($keys as $k) {
            $val = self::getNestedValue($data, $k);
            if ($val) {
                if (is_numeric($val) && (int)$val > 1000000000) {
                    return date('Y-m-d H:i:s', (int)$val);
                }
                $ts = strtotime((string)$val);
                if ($ts !== false) {
                    return date('Y-m-d H:i:s', $ts);
                }
            }
        }

        return TimezoneHelper::now();
    }

    /**
     * Store snapshot image into the administrator-configured folder path
     */
    private static function processSnapshotImage(array $data, array $filesData, array $mapping, string $plate, string $direction): string {
        // 1. Resolve Target Upload Folder
        $configuredPath = trim($mapping['image_folder_path'] ?? 'storage/uploads/anpr_snapshots');
        $uploadDir = self::resolveUploadDirectory($configuredPath);

        $cleanPlate = preg_replace('/[^A-Za-z0-9]/', '_', $plate ?: 'VEHICLE');
        $filename = $cleanPlate . '_' . strtolower($direction) . '_' . date('Ymd_His') . '_' . substr(uniqid(), -4) . '.jpg';

        // 2. Check Multipart File Upload ($FILES)
        if (!empty($filesData)) {
            foreach ($filesData as $fileItem) {
                if (isset($fileItem['tmp_name']) && is_uploaded_file($fileItem['tmp_name'])) {
                    // Make sure it's an image
                    $mime = mime_content_type($fileItem['tmp_name']) ?: '';
                    if (str_starts_with($mime, 'image/') || str_ends_with(strtolower($fileItem['name'] ?? ''), '.jpg') || str_ends_with(strtolower($fileItem['name'] ?? ''), '.jpeg') || str_ends_with(strtolower($fileItem['name'] ?? ''), '.png')) {
                        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
                        if (move_uploaded_file($fileItem['tmp_name'], $targetPath)) {
                            return self::getPublicUrlPath($configuredPath, $filename);
                        }
                    }
                }
            }
        }

        // 3. Check JSON Payload for Base64 or Image URL
        $imgKey = $mapping['field_image'] ?? 'Image';
        $rawImage = self::getNestedValue($data, $imgKey)
                 ?? self::getNestedValue($data, 'Image')
                 ?? self::getNestedValue($data, 'SnapPicURL')
                 ?? self::getNestedValue($data, 'picture')
                 ?? self::getNestedValue($data, 'image_base64')
                 ?? self::getNestedValue($data, 'plate_image')
                 ?? self::getNestedValue($data, 'picData')
                 ?? self::getNestedValue($data, 'params.picData')
                 ?? self::getNestedValue($data, 'params.picInfo.0.picData')
                 ?? self::getNestedValue($data, 'params.passingRecord.picInfo.0.picData')
                 ?? self::getNestedValue($data, 'params.passingRecord.picData')
                 ?? self::getNestedValue($data, 'MotorVehicleListObject.MotorVehicleObject.0.SubImageList.SubImageInfoObject.0.Data')
                 ?? self::getNestedValue($data, 'MotorVehicleListObject.MotorVehicleObject.SubImageList.SubImageInfoObject.0.Data')
                 ?? self::getNestedValue($data, 'MotorVehicleListObject.MotorVehicleObject.0.SubImageList.SubImageInfoObject.0.StoragePath')
                 ?? self::getNestedValue($data, 'MotorVehicleListObject.MotorVehicleObject.SubImageList.SubImageInfoObject.0.StoragePath')
                 ?? self::getNestedValue($data, 'SubImageList.SubImageInfoObject.0.Data')
                 ?? self::getNestedValue($data, 'SubImageList.SubImageInfoObject.0.StoragePath')
                 ?? self::getNestedValue($data, 'SubImageInfoObject.0.Data')
                 ?? self::getNestedValue($data, 'SubImageInfoObject.0.StoragePath')
                 ?? self::getNestedValue($data, 'SubImageInfoObject.Data')
                 ?? self::getNestedValue($data, 'SubImageInfoObject.StoragePath')
                 ?? self::findImageRecursive($data)
                 ?? '';

        if (!$rawImage || !is_string($rawImage)) {
            return '';
        }

        // If it's already an absolute or web URL
        if (str_starts_with($rawImage, 'http://') || str_starts_with($rawImage, 'https://')) {
            return $rawImage;
        }

        // If Base64 string
        $base64Data = $rawImage;
        if (preg_match('/^data:image\/(\w+);base64,/', $rawImage, $matches)) {
            $base64Data = substr($rawImage, strpos($rawImage, ',') + 1);
        }

        $decoded = base64_decode($base64Data, true);
        if ($decoded !== false && strlen($decoded) > 100) {
            $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
            file_put_contents($targetPath, $decoded);
            return self::getPublicUrlPath($configuredPath, $filename);
        }

        return '';
    }

    /**
     * Recursively search for base64 image data or image URL
     */
    private static function findImageRecursive(array $arr, int $depth = 0): ?string {
        if ($depth > 8) return null;
        foreach ($arr as $key => $val) {
            $kLower = strtolower((string)$key);
            if (is_string($val) && (
                str_contains($kLower, 'pic') ||
                str_contains($kLower, 'image') ||
                str_contains($kLower, 'photo') ||
                str_contains($kLower, 'snapshot')
            )) {
                if (strlen($val) > 100 || str_starts_with($val, 'http://') || str_starts_with($val, 'https://') || str_starts_with($val, 'data:image')) {
                    return $val;
                }
            }
            if (is_array($val)) {
                $nested = self::findImageRecursive($val, $depth + 1);
                if ($nested) return $nested;
            }
        }
        return null;
    }

    /**
     * Resolve folder path (handles absolute paths or relative to project root)
     */
    public static function resolveUploadDirectory(string $path): string {
        $path = trim($path);
        if (!$path) {
            $path = 'storage/uploads/anpr_snapshots';
        }

        $isAbsolute = (DIRECTORY_SEPARATOR === '\\' && preg_match('/^[a-zA-Z]:[\\\\\/]/', $path)) 
                   || str_starts_with($path, '/');

        if ($isAbsolute) {
            $fullPath = $path;
        } else {
            $projectRoot = realpath(__DIR__ . '/../../');
            $fullPath = ($projectRoot ?: dirname(__DIR__, 2)) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
        }

        if (!is_dir($fullPath)) {
            @mkdir($fullPath, 0777, true);
        }

        return $fullPath;
    }

    /**
     * Compute relative web URL for browser display
     */
    private static function getPublicUrlPath(string $configuredPath, string $filename): string {
        $normalized = str_replace('\\', '/', $configuredPath);
        if (str_contains($normalized, 'storage/uploads')) {
            $sub = substr($normalized, strpos($normalized, 'storage/uploads'));
            return '/' . trim($sub, '/') . '/' . $filename;
        }
        return '/storage/uploads/anpr_snapshots/' . $filename;
    }

    /**
     * Fallback gate extraction
     */
    private static function extractGateFallback(array $data): string {
        $gateKeys = [
            'gate_id', 'gate', 'gate_code', 'location', 'lane', 'laneNo', 'lane_no', 'lane_id', 'laneId',
            'channel', 'channel_id', 'Channel', 'Lane', 'ChannelID', 'TollGateID', 'camera_number', 'cam_id',
            'params.passingRecord.laneId', 'params.passingRecord.channelId', 'passingRecord.laneId', 'passingRecord.channelId'
        ];
        foreach ($gateKeys as $k) {
            $v = self::getNestedValue($data, $k);
            if ($v !== null && trim((string)$v) !== '') {
                return (string)$v;
            }
        }
        return 'GATE-IN-01';
    }

    /**
     * Safe dot-notation array key getter (e.g. TrafficCar.PlateNumber or PictureInfo.0.PlateNumber)
     */
    public static function getNestedValue(array $data, string $key) {
        if (!$key) return null;
        if (array_key_exists($key, $data)) {
            return $data[$key];
        }

        $segments = explode('.', $key);
        $curr = $data;
        foreach ($segments as $seg) {
            if (is_array($curr) && array_key_exists($seg, $curr)) {
                $curr = $curr[$seg];
            } else {
                return null;
            }
        }
        return $curr;
    }
}
