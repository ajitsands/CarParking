<?php
// Main Application Configuration

return [
    'name' => 'Smart Hospital Parking Management & Visitor Validation System',
    'version' => '1.0.0',
    'url' => getenv('APP_URL') ?: 'http://localhost:8000',
    'client' => 'KIMSHEALTH Medical Center',
    'provider' => 'SaNDS Lab Middle East W.L.L',
    
    // Security & Encryption
    'jwt_secret' => getenv('JWT_SECRET') ?: 'S@nd$L@b_K1MS_P@rk1ng_2026_SecUr3_K3y!#987654321',
    'jwt_expiry' => 86400 * 7, // 7 days token life
    'superadmin_vault_path' => __DIR__ . '/../storage/security/superadmin_vault.json',
    'superadmin_enc_key' => 'S@nd$L@b_V@uLt_K3y_998877665544332211',
    
    // Upload directories
    'upload_dir' => __DIR__ . '/../storage/uploads',
    'log_dir' => __DIR__ . '/../storage/logs',
    
    // Supported Gulf & India Timezones
    'timezones' => [
        'Asia/Bahrain' => 'Bahrain (GMT+3)',
        'Asia/Dubai'   => 'UAE (Dubai/Abu Dhabi) (GMT+4)',
        'Asia/Riyadh'  => 'Saudi Arabia (Riyadh) (GMT+3)',
        'Asia/Qatar'   => 'Qatar (Doha) (GMT+3)',
        'Asia/Kuwait'  => 'Kuwait (GMT+3)',
        'Asia/Muscat'  => 'Oman (Muscat) (GMT+4)',
        'Asia/Kolkata' => 'India (IST) (GMT+5:30)'
    ],

    // Currency Decimal Rules: Bahrain has 3 digits, rest 2 digits
    'currencies' => [
        'BHD' => ['name' => 'Bahraini Dinar', 'symbol' => 'BD', 'decimals' => 3],
        'AED' => ['name' => 'UAE Dirham', 'symbol' => 'AED', 'decimals' => 2],
        'SAR' => ['name' => 'Saudi Riyal', 'symbol' => 'SAR', 'decimals' => 2],
        'QAR' => ['name' => 'Qatari Riyal', 'symbol' => 'QAR', 'decimals' => 2],
        'KWD' => ['name' => 'Kuwaiti Dinar', 'symbol' => 'KD', 'decimals' => 3],
        'OMR' => ['name' => 'Omani Rial', 'symbol' => 'OMR', 'decimals' => 3],
        'INR' => ['name' => 'Indian Rupee', 'symbol' => '₹', 'decimals' => 2]
    ]
];
