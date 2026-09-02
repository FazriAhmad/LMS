<?php

namespace App\Support;

/**
 * TOTP (RFC 6238) minimal — base32 secret, HMAC-SHA1, langkah 30 detik, 6 digit.
 * Native (hash_hmac dari stdlib PHP), tanpa package pihak ketiga (pragmatic/laravel-google2fa dll)
 * karena algoritmanya cuma ~20 baris dan sudah distandardisasi, kompatibel dengan Google
 * Authenticator/Authy/aplikasi TOTP manapun.
 */
class Totp
{
    private const STEP = 30;
    private const DIGITS = 6;
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret(int $bytes = 20): string
    {
        return self::base32Encode(random_bytes($bytes));
    }

    public static function currentCode(string $secret, ?int $timestamp = null): string
    {
        return self::codeForCounter($secret, intdiv($timestamp ?? time(), self::STEP));
    }

    /** Terima kode dari langkah sekarang atau ±1 sebelumnya — toleransi jam device sedikit meleset. */
    public static function verify(string $secret, string $code, ?int $timestamp = null): bool
    {
        $counter = intdiv($timestamp ?? time(), self::STEP);
        $code = trim($code);

        foreach ([$counter, $counter - 1, $counter + 1] as $c) {
            if (hash_equals(self::codeForCounter($secret, $c), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function otpauthUrl(string $secret, string $accountLabel, string $issuer = 'Sakuragaoka Gakuen'): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&digits=%d&period=%d',
            rawurlencode($issuer), rawurlencode($accountLabel), $secret, rawurlencode($issuer), self::DIGITS, self::STEP
        );
    }

    private static function codeForCounter(string $secret, int $counter): string
    {
        $key = self::base32Decode($secret);
        $binCounter = pack('N*', 0) . pack('N*', $counter); // 8 byte big-endian
        $hash = hash_hmac('sha1', $binCounter, $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($value % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    private static function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }
        $bits = str_pad($bits, (int) ceil(strlen($bits) / 5) * 5, '0', STR_PAD_RIGHT);

        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec($chunk)];
        }

        return $out;
    }

    private static function base32Decode(string $secret): string
    {
        $bits = '';
        foreach (str_split(strtoupper($secret)) as $char) {
            $pos = strpos(self::ALPHABET, $char);
            if ($pos === false) {
                continue;
            }
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $bytes .= chr(bindec($byte));
            }
        }

        return $bytes;
    }
}
