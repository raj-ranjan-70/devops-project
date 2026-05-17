<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\Request;

class AdminVendorController extends Controller
{
    public function index()
    {
        $vendors = Vendor::with('user')->orderBy('created_at', 'desc')->get();
        return response()->json($vendors);
    }

    public function show($id)
    {
        $vendor = Vendor::with(['user', 'event'])->findOrFail($id);
        return response()->json($vendor);
    }

    public function update(Request $request, $id)
    {
        $vendor = Vendor::findOrFail($id);
        $validated = $request->validate([
            'verification_status' => 'in:pending,approved,rejected',
            'status' => 'in:available,busy,offline',
        ]);

        $vendor->update($validated);
        return response()->json($vendor);
    }

    public function destroy($id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->delete();
        return response()->json(['message' => 'Vendor deleted successfully']);
    }
}
