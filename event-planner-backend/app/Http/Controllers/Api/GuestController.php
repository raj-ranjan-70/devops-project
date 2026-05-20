<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\RSVPInvitationMail;

class GuestController extends Controller
{
    public function index(Request $request)
    {
        $guests = Guest::whereHas('event', function($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        })->get();
        return response()->json($guests);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'planner' && !$user->is_active) {
            return response()->json(['message' => 'Your account is currently suspended. You cannot add new guests.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'event_id' => 'required|exists:events,id',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'rsvp_status' => 'required|in:pending,confirmed,declined',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $event = \App\Models\Event::findOrFail($request->event_id);
        if ($event->status === 'completed') {
            return response()->json(['message' => 'Cannot add guests to a completed event.'], 422);
        }

        $guest = Guest::create($request->all());
        return response()->json($guest, 201);
    }

    public function update(Request $request, Guest $guest)
    {
        if ($guest->event->status === 'completed') {
            return response()->json(['message' => 'Cannot update guests of a completed event.'], 422);
        }

        $guest->update($request->all());
        return response()->json($guest);
    }

    public function destroy(Guest $guest)
    {
        if ($guest->event->status === 'completed') {
            return response()->json(['message' => 'Cannot remove guests from a completed event.'], 422);
        }

        $guest->delete();
        return response()->json(null, 204);
    }

    public function rsvpEmail(Request $request, Guest $guest)
    {
        if ($guest->event->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($guest->event->status === 'completed') {
            return response()->json(['error' => 'Cannot send invitations for a completed event.'], 422);
        }

        if (!$guest->email) {
            return response()->json(['error' => 'Guest does not have a valid email address configured.'], 422);
        }

        try {
            // Queue the professional luxury-style mailable
            Mail::to($guest->email)->queue(new RSVPInvitationMail($guest));

            // Automatically set status to pending upon successful queue dispatch
            $guest->update(['rsvp_status' => 'pending']);

            Log::info("RSVP Invitation email successfully queued to: {$guest->email} for Event: {$guest->event->title}");

            return response()->json([
                'message' => "RSVP email invitation sent successfully to {$guest->name} ({$guest->email})!"
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to queue RSVP invitation email to {$guest->email}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to dispatch invitation email. Please check SMTP / mail configuration settings in .env.'
            ], 500);
        }
    }

    public function rsvpBulk(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'guest_ids' => 'required|array',
            'guest_ids.*' => 'required|exists:guests,id',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $guestIds = $request->input('guest_ids');
        $guests = Guest::whereIn('id', $guestIds)->get();

        $successCount = 0;
        $failedCount = 0;

        foreach ($guests as $guest) {
            /** @var \App\Models\Guest $guest */
            if ($guest->event->user_id !== $request->user()->id) {
                continue;
            }

            if ($guest->event->status === 'completed') {
                continue;
            }

            if (!$guest->email) {
                continue;
            }

            try {
                Mail::to($guest->email)->queue(new RSVPInvitationMail($guest));

                $guest->update(['rsvp_status' => 'pending']);

                Log::info("RSVP Invitation email successfully queued to: {$guest->email} for Event: {$guest->event->title}");
                $successCount++;
            } catch (\Exception $e) {
                Log::error("Failed to queue RSVP invitation email to {$guest->email}: " . $e->getMessage());
                $failedCount++;
            }
        }

        return response()->json([
            'message' => "Successfully queued {$successCount} RSVP invitation email(s)." . ($failedCount > 0 ? " Failed to queue {$failedCount} email(s)." : "")
        ]);
    }


    /**
     * Handle public single-click RSVP response actions from email CTAs (Accept/Decline)
     * Secure token-based API endpoint
     */
    public function publicRsvp(Request $request, $token, $action)
    {
        if (!in_array($action, ['accept', 'decline'])) {
            return response()->json([
                'error' => 'invalid_action',
                'message' => 'The requested RSVP action is invalid.'
            ], 400);
        }

        // Secure token lookup
        $guest = Guest::where('rsvp_token', $token)->first();

        if (!$guest) {
            return response()->json([
                'error' => 'invalid_token',
                'message' => 'This RSVP invitation link is invalid or has expired.'
            ], 404);
        }

        // Replay protection - Prevent overwriting an already recorded response
        if ($guest->rsvp_responded_at !== null) {
            return response()->json([
                'error' => 'already_responded',
                'message' => 'You have already responded to this invitation.',
                'guest' => [
                    'name' => $guest->name,
                    'rsvp_status' => $guest->rsvp_status
                ],
                'event' => [
                    'title' => $guest->event->title
                ]
            ], 422);
        }

        // Map accept/decline action to Laravel event database status
        $status = ($action === 'accept') ? 'confirmed' : 'declined';

        // Perform instant atomic update
        $guest->update([
            'rsvp_status' => $status,
            'rsvp_responded_at' => now()
        ]);

        Log::info("Guest {$guest->name} has successfully responded with status '{$status}' to Event: {$guest->event->title} via email CTA token.");

        return response()->json([
            'success' => true,
            'message' => 'Your response has been recorded successfully.',
            'status' => $status,
            'guest' => [
                'name' => $guest->name,
                'rsvp_status' => $guest->rsvp_status
            ],
            'event' => [
                'title' => $guest->event->title
            ]
        ]);
    }
}
