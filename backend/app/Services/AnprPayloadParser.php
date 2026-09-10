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

        // 1. Decode JSON or use POST array
        $data = json_decode($rawBody, true);
        if (!is_array($data)) {
            $data = $postData;
        }

        // 2. Extract Plate Number (Mapping -> Nested -> Auto fallback)
        $plate = self::extractPlateNumber($data, $mapping['field_plate']);

        // 3. Extract Gate / Channel / Lane
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
            ?? self::getNestedValue($data, 'deviceNo') 
            ?? self::getNestedValue($data, 'CameraID')
            ?? ($direction === 'ENTRY' ? 'ANPR-ENTRY-CAM-01' : 'ANPR-EXIT-CAM-01')
        );

        // 6. Confidence Score
        $confidence = (float)(
            self::getNestedValue($data, 'confidence') 
            ?? self::getNestedValue($data, 'Confidence') 
            ?? self::getNestedValue($data, 'RecognitionConfidence')
            ?? 98.50
        );

        // 7. Vehicle Type & Color
        $vehicleType = (string)(
            self::getNestedValue($data, $mapping['field_type']) 
            ?? self::getNestedValue($data, 'VehicleType') 
            ?? self::getNestedValue($data, 'vehicle_type') 
            ?? self::getNestedValue($data, 'CarType') 
            ?? 'car'
        );

        $vehicleColor = (string)(
            self::getNestedValue($data, $mapping['field_color']) 
            ?? self::getNestedValue($data, 'VehicleColor') 
            ?? self::getNestedValue($data, 'PlateColor') 
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
               ?? self::getNestedValue($sampleData, 'picture');
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
    private static function extractPlateNumber(array $data, string $configuredKey = ''): string {
        // 1. Check configured key
        if ($configuredKey) {
            $val = self::getNestedValue($data, $configuredKey);
            if ($val !== null && is_scalar($val) && trim((string)$val) !== '') {
                return strtoupper(trim((string)$val));
            }
        }

        // 2. Check Dahua / Hikvision / Uniview common fields
        $candidateKeys = [
            'PlateNumber',
            'plateNumber',
            'plate_number',
            'licensePlate',
            'LicensePlate',
            'PlateText',
            'plate',
            'license_plate',
            'TrafficCar.PlateNumber',
            'PlateResult.license',
            'PictureInfo.0.PlateNumber',
            'car_number'
        ];

        foreach ($candidateKeys as $k) {
            $val = self::getNestedValue($data, $k);
            if ($val !== null && is_scalar($val) && trim((string)$val) !== '') {
                return strtoupper(trim((string)$val));
            }
        }

        return '';
    }

    /**
     * Resolve Gate ID from channel or lane
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

        if (!$val) {
            return 'GATE-IN-01';
        }

        return $val;
    }

    /**
     * Resolve Direction (ENTRY vs EXIT)
     */
    private static function resolveDirection(array $data, string $gateId, $gateRaw, array $mapping): string {
        // Explicit direction key
        $explicit = self::getNestedValue($data, 'direction') 
                 ?? self::getNestedValue($data, 'Direction') 
                 ?? self::getNestedValue($data, 'PassDirection');

        if ($explicit) {
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
            'timestamp',
            'date_time',
            'datetime'
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
                    $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
                    if (move_uploaded_file($fileItem['tmp_name'], $targetPath)) {
                        return self::getPublicUrlPath($configuredPath, $filename);
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

        $decoded = base64_decode($base64Data);
        if ($decoded !== false && strlen($decoded) > 50) {
            $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
            file_put_contents($targetPath, $decoded);
            return self::getPublicUrlPath($configuredPath, $filename);
        }

        return '';
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
        $gateKeys = ['gate_id', 'gate', 'location', 'lane', 'channel', 'camera_number', 'cam_id'];
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
