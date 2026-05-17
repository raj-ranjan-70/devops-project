<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminSeeder::class,
            VendorServiceSeeder::class,
        ]);

        $categories = [
            ['name' => 'Wedding', 'type' => 'event'],
            ['name' => 'Gala', 'type' => 'event'],
            ['name' => 'Corporate', 'type' => 'event'],
            ['name' => 'Birthday', 'type' => 'event'],
            ['name' => 'Florist', 'type' => 'vendor'],
            ['name' => 'Catering', 'type' => 'vendor'],
            ['name' => 'Photography', 'type' => 'vendor'],
            ['name' => 'Venue', 'type' => 'vendor'],
        ];

        foreach ($categories as $cat) {

            $slug = Str::slug($cat['name']);

            Category::firstOrCreate(
                ['slug' => $slug],
                [
                    'name' => $cat['name'],
                    'type' => $cat['type'],
                    'slug' => $slug
                ]
            );
        }
    }
}