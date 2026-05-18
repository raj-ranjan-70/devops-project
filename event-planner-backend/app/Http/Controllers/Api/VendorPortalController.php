<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VendorService;
use App\Models\ServiceBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VendorPortalController extends Controller
{
    /**
     * Retrieve all services for the authenticated vendor user.
     */
    public function getServices(Request $request)
    {
        $userId = $request->user()->id;
        $services = VendorService::where('user_id', $userId)->get();
        return response()->json($services);
    }

    /**
     * Store a new vendor service profile.
     */
    public function storeService(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'business_name' => 'required|string|max:255',
            'category' => 'required|string',
            'description' => 'nullable|string',
            'starting_price' => 'required|numeric|min:0',
            'location' => 'nullable|string',
            'image_url' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $service = VendorService::create([
            'user_id' => $request->user()->id,
            'business_name' => $request->business_name,
            'category' => $request->category,
            'description' => $request->description,
            'starting_price' => $request->starting_price,
            'location' => $request->location,
            'image_url' => $request->image_url,
            'is_available' => true,
            'rating' => 5.0, // default rating for new profiles
        ]);

        return response()->json($service, 201);
    }

    /**
     * Update an existing vendor service profile.
     */
    public function updateService(Request $request, $id)
    {
        $service = VendorService::where('user_id', $request->user()->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'business_name' => 'required|string|max:255',
            'category' => 'required|string',
            'description' => 'nullable|string',
            'starting_price' => 'required|numeric|min:0',
            'location' => 'nullable|string',
            'image_url' => 'nullable|string',
            'is_available' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Handle raw or parsed boolean for is_available
        $data = $request->all();
        if ($request->has('is_available')) {
            $data['is_available'] = filter_var($request->is_available, FILTER_VALIDATE_BOOLEAN);
        }

        $service->update($data);

        return response()->json($service);
    }

    /**
     * Delete a vendor service profile.
     */
    public function destroyService(Request $request, $id)
    {
        $service = VendorService::where('user_id', $request->user()->id)->findOrFail($id);
        $service->delete();
        return response()->json(null, 204);
    }

    /**
     * Retrieve all bookings for the authenticated vendor's services.
     */
    public function getBookings(Request $request)
    {
        $userId = $request->user()->id;
        $serviceIds = VendorService::where('user_id', $userId)->pluck('id');
        
        $bookings = ServiceBooking::whereIn('vendor_service_id', $serviceIds)
            ->with(['event', 'vendorService'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($bookings);
    }

    /**
     * Accept a pending booking request.
     */
    public function acceptBooking(Request $request, $id)
    {
        $userId = $request->user()->id;
        $booking = ServiceBooking::whereHas('vendorService', function($q) use ($userId) {
            $q->where('user_id', $userId);
        })->findOrFail($id);

        $booking->update(['status' => 'accepted']);

        return response()->json($booking);
    }

    /**
     * Decline a pending booking request.
     */
    public function declineBooking(Request $request, $id)
    {
        $userId = $request->user()->id;
        $booking = ServiceBooking::whereHas('vendorService', function($q) use ($userId) {
            $q->where('user_id', $userId);
        })->findOrFail($id);

        $booking->update(['status' => 'rejected']);

        return response()->json($booking);
    }
}
