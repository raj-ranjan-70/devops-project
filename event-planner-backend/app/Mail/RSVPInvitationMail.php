<?php

namespace App\Mail;

use App\Models\Guest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RSVPInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Resilient retry settings for queued processing
     */
    public $tries = 3;
    public $backoff = 60;

    public $guest;
    public $event;
    public $frontendUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(Guest $guest)
    {
        $this->guest = $guest;
        $this->event = $guest->event;
        $this->frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Exclusive Invitation to: " . $this->event->title,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.rsvp-invitation',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Handle job execution failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("RSVP Invitation Email dispatch failed for Guest: {$this->guest->name} ({$this->guest->email}) on Event: {$this->event->title}. Error: " . $exception->getMessage());
    }
}
