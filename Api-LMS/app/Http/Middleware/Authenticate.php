<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Backend API murni — tidak ada halaman login web untuk redirect.
     * Selalu biarkan AuthenticationException menjalar supaya dirender JSON 401.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}
