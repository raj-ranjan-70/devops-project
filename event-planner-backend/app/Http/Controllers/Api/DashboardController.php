<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Guest;
use App\Models\Vendor;
use App\Models\User;
use App\Models\Payment;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        if ($user->role === 'admin') {
            return response()->json([
                'stats' => [
                    'total_users' => User::where('role', '!=', 'admin')->count(),
                    'active_planners' => User::where('role', 'planner')->where('is_active', true)->count(),
                    'verified_vendors' => User::where('role', 'vendor')->where('is_active', true)->count(),
                    'pending_approvals' => User::where('role', 'vendor')->where('is_active', false)->count(),
                    'platform_revenue' => Payment::where('status', 'completed')->sum('amount') ?? 0,
                ],
                'recent_users' => User::where('role', '!=', 'admin')->orderBy('created_at', 'desc')->limit(5)->get(),
                'pending_vendors' => User::where('role', 'vendor')->where('is_active', false)->orderBy('created_at', 'desc')->limit(5)->get(),
            ]);
        }

        // Default planner logic
        $totalEvents = Event::where('user_id', $userId)->count();
        $upcomingEvents = Event::where('user_id', $userId)->where('status', 'upcoming')->count();
        
        $totalGuests = Guest::whereHas('event', function($query) use ($userId) {
            $query->where('user_id', $userId);
        })->count();

        $totalVendors = Vendor::whereHas('event', function($query) use ($userId) {
            $query->where('user_id', $userId);
        })->count();

        $recentEvents = Event::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'stats' => [
                'total_events' => $totalEvents,
                'upcoming_events' => $upcomingEvents,
                'total_guests' => $totalGuests,
                'total_vendors' => $totalVendors,
            ],
            'recent_events' => $recentEvents
        ]);
    }
}
