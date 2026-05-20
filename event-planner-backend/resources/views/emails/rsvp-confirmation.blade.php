<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSVP Confirmed: {{ $event->title }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #fbfaf7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #374151;
            -webkit-font-smoothing: antialiased;
        }

        .wrapper {
            width: 100%;
            background-color: #fbfaf7;
            padding: 40px 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
            border: 1px solid #f3efea;
        }

        .header-image {
            width: 100%;
            height: 260px;
            object-fit: cover;
            display: block;
        }

        .content {
            padding: 40px;
            text-align: center;
        }

        .confirmation-badge {
            display: inline-block;
            background-color: #ecfdf5;
            color: #059669;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 6px 16px;
            border-radius: 100px;
            margin-bottom: 24px;
            border: 1px solid #d1fae5;
        }

        .salutation {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 16px 0;
            letter-spacing: -0.5px;
        }

        .confirmation-text {
            font-size: 15px;
            line-height: 1.6;
            color: #6b7280;
            margin: 0 0 32px 0;
        }

        .event-card {
            background-color: #fcfbfa;
            border: 1px solid #f0eae1;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 35px;
            text-align: left;
        }

        .event-title {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 12px 0;
        }

        .detail-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 14px;
            color: #4b5563;
        }

        .detail-row:last-child {
            margin-bottom: 0;
        }

        .detail-label {
            font-weight: 700;
            width: 100px;
            color: #6355d8;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 1px;
        }

        .detail-val {
            flex: 1;
        }

        .highlight-text {
            font-size: 14px;
            font-weight: 600;
            color: #10b981;
            margin-top: 25px;
            text-align: center;
        }

        .footer {
            padding: 30px 40px;
            background-color: #faf9f6;
            border-top: 1px solid #f3efea;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            line-height: 1.5;
        }

        .footer a {
            color: #6355d8;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <div class="container">
            @php
                $coverUrl = $event->cover_image
                    ? (str_starts_with($event->cover_image, 'http') ? $event->cover_image : url($event->cover_image))
                    : 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop';
            @endphp
            <img class="header-image" src="{{ $coverUrl }}" alt="Event Banner">

            <div class="content">
                <div class="confirmation-badge">RSVP Confirmed</div>
                <h1 class="salutation">Dearest {{ $guest->name }},</h1>
                <p class="confirmation-text">
                    We are absolutely thrilled to know you will be joining us! Your presence will fill our celebration with joy, and we cannot wait to share these precious moments with you.
                </p>

                <div class="event-card">
                    <h2 class="event-title">{{ $event->title }}</h2>
                    @if($event->description)
                        <p style="font-size: 14px; line-height: 1.5; color: #6b7280; margin: 0 0 20px 0;">{{ $event->description }}</p>
                    @endif

                    <div class="detail-row">
                        <span class="detail-label">Date & Time</span>
                        <span class="detail-val">{{ \Carbon\Carbon::parse($event->event_date)->format('F d, Y \a\t h:i A') }}</span>
                    </div>
                    @if($event->duration)
                        <div class="detail-row">
                            <span class="detail-label">Duration</span>
                            <span class="detail-val">{{ $event->duration }} Hours</span>
                        </div>
                    @endif
                    <div class="detail-row">
                        <span class="detail-label">Venue</span>
                        <span class="detail-val">{{ $event->venue }}</span>
                    </div>

                    <div class="highlight-text">
                        ✓ You are successfully registered as attending
                    </div>
                </div>

                <p class="confirmation-text" style="font-size: 13px; margin-bottom: 0;">
                    Please keep this email for your records. If you have any dietary restrictions or need to make adjustments to your response, please contact the event planners.
                </p>
            </div>

            <div class="footer">
                This email was sent to {{ $guest->email }} on behalf of Aura Events.<br>
                Please contact our support team at <a href="mailto:support@auraevents.com">support@auraevents.com</a> if
                you have any questions.
            </div>
        </div>
    </div>
</body>

</html>
