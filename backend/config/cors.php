<?php

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://127.0.0.1:4200',
        'http://localhost:4200',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Como de momento NO usamos auth por cookies, mantenlo en false
    'supports_credentials' => false,
];
