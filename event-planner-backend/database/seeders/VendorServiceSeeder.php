<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\VendorService;
use Illuminate\Support\Facades\Hash;

class VendorServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create or Find Vendor Users
        $vendorsData = [
            [
                'name' => 'Aura Captures',
                'email' => 'photo_vendor@aura.com',
                'password' => Hash::make('Password@123'),
                'role' => 'vendor',
            ],
            [
                'name' => 'Gourmet Bites',
                'email' => 'catering_vendor@aura.com',
                'password' => Hash::make('Password@123'),
                'role' => 'vendor',
            ],
            [
                'name' => 'Vibe Setters',
                'email' => 'dj_vendor@aura.com',
                'password' => Hash::make('Password@123'),
                'role' => 'vendor',
            ],
            [
                'name' => 'The Grand Glasshouse',
                'email' => 'venue_vendor@aura.com',
                'password' => Hash::make('Password@123'),
                'role' => 'vendor',
            ],
            [
                'name' => 'Blossom & Co',
                'email' => 'florist_vendor@aura.com',
                'password' => Hash::make('Password@123'),
                'role' => 'vendor',
            ]
        ];

        $users = [];
        foreach ($vendorsData as $v) {
            $user = User::firstOrCreate(
                ['email' => $v['email']],
                [
                    'name' => $v['name'],
                    'password' => $v['password'],
                    'role' => $v['role'],
                    'is_active' => true
                ]
            );
            $users[$v['email']] = $user;
        }

        // 2. Add Vendor Services
        $services = [
            [
                'user_id' => $users['photo_vendor@aura.com']->id,
                'business_name' => 'Aura Captures Photography',
                'category' => 'Photography',
                'description' => 'Premium wedding, engagement, and corporate event photography. Capturing every candid moment with stunning clarity and artistic styling.',
                'starting_price' => 1500.00,
                'location' => 'New York, NY',
                'rating' => 4.90,
                'image_url' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop',
                'is_available' => true
            ],
            [
                'user_id' => $users['catering_vendor@aura.com']->id,
                'business_name' => 'Gourmet Bites Catering',
                'category' => 'Catering',
                'description' => 'Five-star catering offering customized menus ranging from elegant sit-down dinners to gourmet cocktail platters. Dietary options available.',
                'starting_price' => 3000.00,
                'location' => 'Boston, MA',
                'rating' => 4.85,
                'image_url' => 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=600&auto=format&fit=crop',
                'is_available' => true
            ],
            [
                'user_id' => $users['dj_vendor@aura.com']->id,
                'business_name' => 'Vibe Setters DJ & Live Sound',
                'category' => 'Music/DJ',
                'description' => 'Professional DJs and concert-grade sound setup. We curate custom playlists and coordinate event transitions to keep your dance floor packed all night.',
                'starting_price' => 1200.00,
                'location' => 'New York, NY',
                'rating' => 4.75,
                'image_url' => 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop',
                'is_available' => true
            ],
            [
                'user_id' => $users['venue_vendor@aura.com']->id,
                'business_name' => 'The Grand Glasshouse Venue',
                'category' => 'Venue',
                'description' => 'Breathtaking indoor glass atrium venue surrounded by lush botanical gardens. Fits up to 300 guests. Includes standard setup and tables.',
                'starting_price' => 7500.00,
                'location' => 'Los Angeles, CA',
                'rating' => 4.95,
                'image_url' => 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=600&auto=format&fit=crop',
                'is_available' => true
            ],
            [
                'user_id' => $users['florist_vendor@aura.com']->id,
                'business_name' => 'Blossom & Co Florals',
                'category' => 'Florist',
                'description' => 'Luxury floral centerpieces, bridal bouquets, floral arches, and venue botanical arrangements. Bespoke designs curated uniquely for your theme.',
                'starting_price' => 900.00,
                'location' => 'Chicago, IL',
                'rating' => 4.60,
                'image_url' => 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop',
                'is_available' => true
            ]
        ];

        foreach ($services as $service) {
            VendorService::updateOrCreate(
                [
                    'user_id' => $service['user_id'],
                    'business_name' => $service['business_name']
                ],
                $service
            );
        }
    }
}
