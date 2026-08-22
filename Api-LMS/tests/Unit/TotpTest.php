<?php

namespace Tests\Unit;

use App\Support\Totp;
use PHPUnit\Framework\TestCase;

class TotpTest extends TestCase
{
    /** Vektor uji resmi RFC 6238 Appendix B (kunci ASCII "12345678901234567890", T=59 → 287082). */
    public function test_matches_rfc6238_test_vector(): void
    {
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // base32("12345678901234567890")

        $this->assertSame('287082', Totp::currentCode($secret, 59));
    }

    public function test_verify_accepts_correct_code_and_rejects_wrong_code(): void
    {
        $secret = Totp::generateSecret();
        $code = Totp::currentCode($secret);

        $this->assertTrue(Totp::verify($secret, $code));
        $this->assertFalse(Totp::verify($secret, '000000'));
    }

    public function test_verify_rejects_code_from_different_secret(): void
    {
        $secretA = Totp::generateSecret();
        $secretB = Totp::generateSecret();
        $codeA = Totp::currentCode($secretA);

        $this->assertFalse(Totp::verify($secretB, $codeA));
    }
}
