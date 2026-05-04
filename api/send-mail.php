<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function compact_string(string $value, int $limit = 2000): string
{
    $value = trim($value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $limit, 'UTF-8');
    }

    return substr($value, 0, $limit);
}

function display_field_name(string $name): string
{
    $name = str_replace(['_', '-'], ' ', $name);
    $name = trim($name);
    if ($name === '') {
        return 'поле';
    }

    if (function_exists('mb_convert_case')) {
        return mb_convert_case($name, MB_CASE_TITLE, 'UTF-8');
    }

    return ucwords($name);
}

function smtp_expect($socket, array $expectedCodes): string
{
    $response = '';

    while (!feof($socket)) {
        $line = fgets($socket, 2048);
        if ($line === false) {
            break;
        }

        $response .= $line;

        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    if ($response === '') {
        throw new RuntimeException('SMTP: пустой ответ сервера');
    }

    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP: ' . trim($response));
    }

    return $response;
}

function smtp_command($socket, string $command, array $expectedCodes): string
{
    $written = fwrite($socket, $command . "\r\n");
    if ($written === false) {
        throw new RuntimeException('SMTP: не удалось отправить команду ' . $command);
    }

    return smtp_expect($socket, $expectedCodes);
}

function smtp_send_mail(array $config, string $toEmail, string $subject, string $htmlBody, string $replyTo): void
{
    $host = (string) ($config['host'] ?? '');
    $port = (int) ($config['port'] ?? 0);
    $encryption = strtolower((string) ($config['encryption'] ?? 'ssl'));
    $username = (string) ($config['username'] ?? '');
    $password = (string) ($config['password'] ?? '');
    $fromName = (string) ($config['from_name'] ?? 'Getalo');
    $verifyPeer = (bool) ($config['verify_peer'] ?? true);

    if ($host === '' || $port <= 0 || $username === '' || $password === '') {
        throw new RuntimeException('mail config is incomplete');
    }

    $transport = $encryption === 'ssl' ? 'ssl://' : 'tcp://';
    $streamContext = stream_context_create([
        'ssl' => [
            'verify_peer' => $verifyPeer,
            'verify_peer_name' => $verifyPeer,
            'allow_self_signed' => !$verifyPeer,
        ],
    ]);

    $socket = @stream_socket_client(
        $transport . $host . ':' . $port,
        $errno,
        $errstr,
        20,
        STREAM_CLIENT_CONNECT,
        $streamContext
    );

    if (!$socket) {
        throw new RuntimeException('SMTP connect failed: ' . $errstr . ' (' . $errno . ')');
    }

    stream_set_timeout($socket, 20);

    try {
        smtp_expect($socket, [220]);

        $ehloHost = $_SERVER['SERVER_NAME'] ?? 'localhost';
        smtp_command($socket, 'EHLO ' . $ehloHost, [250]);

        if ($encryption === 'tls') {
            smtp_command($socket, 'STARTTLS', [220]);
            $cryptoOk = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if ($cryptoOk !== true) {
                throw new RuntimeException('SMTP STARTTLS handshake failed');
            }
            smtp_command($socket, 'EHLO ' . $ehloHost, [250]);
        }

        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode($username), [334]);
        smtp_command($socket, base64_encode($password), [235]);

        smtp_command($socket, 'MAIL FROM:<' . $username . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFrom = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . $encodedFrom . ' <' . $username . '>',
            'To: <' . $toEmail . '>',
            'Reply-To: <' . $replyTo . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'X-Mailer: Getalo SMTP Mailer',
        ];

        $normalizedBody = str_replace(["\r\n", "\r"], "\n", $htmlBody);
        $encodedBody = chunk_split(base64_encode($normalizedBody), 76, "\r\n");

        $data = implode("\r\n", $headers) . "\r\n\r\n" . $encodedBody;
        $data = preg_replace('/(^|\r\n)\./', "$1..", $data) ?? $data;

        $written = fwrite($socket, $data . "\r\n.\r\n");
        if ($written === false) {
            throw new RuntimeException('SMTP: не удалось отправить тело письма');
        }

        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function env_first(array $keys, string $default = ''): string
{
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value !== false && trim((string) $value) !== '') {
            return trim((string) $value);
        }
    }

    return $default;
}

function env_first_int(array $keys, int $default): int
{
    $value = env_first($keys, '');
    if ($value === '') {
        return $default;
    }

    $parsed = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($parsed === false) {
        return $default;
    }

    return (int) $parsed;
}

function env_first_bool(array $keys, bool $default): bool
{
    $value = env_first($keys, '');
    if ($value === '') {
        return $default;
    }

    $normalized = strtolower(trim($value));
    if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }

    if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }

    return $default;
}

function load_mail_config(): array
{
    $config = [];
    $configPath = __DIR__ . '/mail.config.php';

    if (is_file($configPath)) {
        $loaded = require $configPath;
        if (is_array($loaded)) {
            $config = $loaded;
        }
    }

    $defaults = [
        'host' => env_first(['MAIL_HOST', 'SMTP_HOST', 'GETALO_SMTP_HOST'], 'mail.hosting.reg.ru'),
        'port' => env_first_int(['MAIL_PORT', 'SMTP_PORT', 'GETALO_SMTP_PORT'], 465),
        'encryption' => env_first(['MAIL_ENCRYPTION', 'SMTP_ENCRYPTION', 'GETALO_SMTP_ENCRYPTION'], 'ssl'),
        'username' => env_first(['MAIL_USERNAME', 'SMTP_USERNAME', 'GETALO_SMTP_USERNAME'], ''),
        'password' => env_first(['MAIL_PASSWORD', 'SMTP_PASSWORD', 'GETALO_SMTP_PASSWORD'], ''),
        'from_name' => env_first(['MAIL_FROM_NAME', 'SMTP_FROM_NAME', 'GETALO_SMTP_FROM_NAME'], 'Getalo'),
        'to_email' => env_first(['MAIL_TO_EMAIL', 'SMTP_TO_EMAIL', 'GETALO_SMTP_TO_EMAIL'], ''),
        'reply_to' => env_first(['MAIL_REPLY_TO', 'SMTP_REPLY_TO', 'GETALO_SMTP_REPLY_TO'], ''),
        'verify_peer' => env_first_bool(['MAIL_VERIFY_PEER', 'SMTP_VERIFY_PEER', 'GETALO_SMTP_VERIFY_PEER'], false),
    ];

    foreach ($defaults as $key => $value) {
        if (!array_key_exists($key, $config) || $config[$key] === '' || $config[$key] === null) {
            $config[$key] = $value;
        }
    }

    if (!isset($config['to_email']) || trim((string) $config['to_email']) === '') {
        $config['to_email'] = (string) ($config['username'] ?? '');
    }

    if (!isset($config['reply_to']) || trim((string) $config['reply_to']) === '') {
        $config['reply_to'] = (string) ($config['username'] ?? '');
    }

    return $config;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, [
        'success' => false,
        'message' => 'Method not allowed',
    ]);
}

$config = load_mail_config();

$honeypot = compact_string((string) ($_POST['company'] ?? ''));
if ($honeypot !== '') {
    json_response(200, [
        'success' => true,
        'message' => 'ok',
    ]);
}

$fieldLabels = [
    'name' => 'Имя',
    'phone' => 'Телефон',
    'material' => 'Материал',
    'shape' => 'Форма столешницы',
    'comment' => 'Комментарий',
    'request_type' => 'Тип заявки',
    'request_source' => 'Источник заявки',
    'form_name' => 'Форма',
    'site_page' => 'Страница',
    'site_time' => 'Время на сайте',
    'city' => 'Город',
    'size' => 'Размер',
    'details' => 'Детали',
    'sink_type' => 'Тип мойки',
    'edge_type' => 'Тип кромки',
    'replace_material' => 'Материал новой столешницы',
    'replace_length' => 'Длина столешницы',
    'replace_comment' => 'Комментарий по замене',
    'promo_request' => 'Пожелание по акции',
    'call_time' => 'Удобное время звонка',
    'example' => 'Ссылка/пример',
    'competitor' => 'Расчет конкурента',
    'length' => 'Длина столешницы (м)',
];

$ignoredFields = ['_subject', '_template', '_captcha', 'company'];
$fields = [];

foreach ($_POST as $key => $value) {
    if (in_array($key, $ignoredFields, true)) {
        continue;
    }

    if (is_array($value)) {
        $value = implode(', ', array_map(static fn($item) => compact_string((string) $item, 500), $value));
    }

    $cleanValue = compact_string((string) $value);
    if ($cleanValue === '') {
        continue;
    }

    $fields[(string) $key] = $cleanValue;
}

$contactPhone = $fields['phone'] ?? '';
$contactName = $fields['name'] ?? '';
if ($contactPhone === '' && $contactName === '') {
    json_response(422, [
        'success' => false,
        'message' => 'Укажите имя или телефон',
    ]);
}

$subject = compact_string((string) ($_POST['_subject'] ?? 'Новая заявка с сайта Getalo'), 200);
if ($subject === '') {
    $subject = 'Новая заявка с сайта Getalo';
}

$clientIp = compact_string((string) ($_SERVER['REMOTE_ADDR'] ?? 'не определен'), 200);
$userAgent = compact_string((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'не определен'), 500);

$rows = '';
foreach ($fields as $key => $value) {
    $label = $fieldLabels[$key] ?? display_field_name($key);
    $rows .= '<tr>'
        . '<td style="padding:8px 10px;border:1px solid #ddd;background:#fafafa;font-weight:700;">' . htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</td>'
        . '<td style="padding:8px 10px;border:1px solid #ddd;">' . nl2br(htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')) . '</td>'
        . '</tr>';
}

$rows .= '<tr><td style="padding:8px 10px;border:1px solid #ddd;background:#fafafa;font-weight:700;">IP</td><td style="padding:8px 10px;border:1px solid #ddd;">' . htmlspecialchars($clientIp, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</td></tr>';
$rows .= '<tr><td style="padding:8px 10px;border:1px solid #ddd;background:#fafafa;font-weight:700;">User Agent</td><td style="padding:8px 10px;border:1px solid #ddd;">' . htmlspecialchars($userAgent, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</td></tr>';

$htmlBody = '<!doctype html><html lang="ru"><head><meta charset="UTF-8"><title>Новая заявка Getalo</title></head><body style="margin:0;padding:20px;background:#f6f6f6;font-family:Arial,sans-serif;color:#111;">'
    . '<div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e7e7e7;border-radius:10px;overflow:hidden;">'
    . '<div style="padding:16px 20px;background:#141414;color:#ffe161;font-weight:700;font-size:18px;">Новая заявка с сайта Getalo</div>'
    . '<div style="padding:18px 20px;">'
    . '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.4;">'
    . $rows
    . '</table>'
    . '</div>'
    . '</div>'
    . '</body></html>';

try {
    $toEmail = (string) ($config['to_email'] ?? $config['username'] ?? '');
    if ($toEmail === '') {
        throw new RuntimeException('mail config does not define recipient');
    }

    $replyTo = $contactPhone !== '' ? (string) ($config['reply_to'] ?? $config['username']) : (string) ($config['reply_to'] ?? $config['username']);

    smtp_send_mail($config, $toEmail, $subject, $htmlBody, $replyTo);

    json_response(200, [
        'success' => true,
        'message' => 'Заявка отправлена',
    ]);
} catch (Throwable $e) {
    json_response(500, [
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
