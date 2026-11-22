import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from fractions import Fraction
import numpy as np

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "sample_drone_images")
os.makedirs(SAMPLE_DIR, exist_ok=True)

def decimal_to_dms_fractions(dec_degrees):
    """Convert decimal degrees to DMS Fractions for EXIF GPS tag insertion."""
    deg = int(dec_degrees)
    rem = (dec_degrees - deg) * 60.0
    minute = int(rem)
    sec = (rem - minute) * 60.0
    sec_int = int(sec * 1000)
    return (Fraction(deg, 1), Fraction(minute, 1), Fraction(sec_int, 1000))

def embed_gps_exif(img: Image.Image, lat: float, lng: float, alt_m: float = 25.0) -> Image.Image:
    """Embeds standard EXIF GPS tags into Pillow Image."""
    exif = img.getexif()
    gps_ifd = exif.get_ifd(0x8825)
    
    gps_ifd[1] = 'N' if lat >= 0 else 'S'
    gps_ifd[2] = decimal_to_dms_fractions(abs(lat))
    
    gps_ifd[3] = 'E' if lng >= 0 else 'W'
    gps_ifd[4] = decimal_to_dms_fractions(abs(lng))
    
    gps_ifd[6] = Fraction(int(alt_m * 10), 10)
    return exif

def generate_photorealistic_asphalt_texture(width=1000, height=1000, base_tone=65, seed=42):
    """Generates realistic asphalt surface with bitumen aggregate noise and wear patches."""
    np.random.seed(seed)
    
    # 1. Base asphalt layer with micro-aggregate grain
    noise = np.random.normal(base_tone, 7.5, (height, width, 3)).astype(np.float32)
    
    # 2. Large-scale bitumen tonal variation (wear streaks)
    grid_y, grid_x = np.mgrid[0:height, 0:width]
    streak_variation = (np.sin(grid_x / 80.0) * 3.0 + np.cos(grid_y / 110.0) * 4.0)
    noise[:, :, 0] += streak_variation
    noise[:, :, 1] += streak_variation * 1.05
    noise[:, :, 2] += streak_variation * 1.10
    
    # 3. Roadside dirt / sandy shoulder accumulation on edges
    dirt_left = np.clip(1.0 - (grid_x / 140.0), 0, 1) ** 1.8
    dirt_right = np.clip((grid_x - (width - 140.0)) / 140.0, 0, 1) ** 1.8
    dirt_mask = dirt_left + dirt_right
    
    noise[:, :, 0] += dirt_mask * 28.0  # Warm brown soil tint
    noise[:, :, 1] += dirt_mask * 22.0
    noise[:, :, 2] += dirt_mask * 12.0
    
    # 4. Oil stains & moisture spots
    for _ in range(8):
        sx = np.random.randint(150, width - 150)
        sy = np.random.randint(80, height - 80)
        radius = np.random.randint(25, 70)
        dist_sq = (grid_x - sx)**2 + (grid_y - sy)**2
        stain = np.clip(1.0 - (dist_sq / (radius**2)), 0, 1) * np.random.uniform(12, 25)
        noise[:, :, 0] -= stain
        noise[:, :, 1] -= stain
        noise[:, :, 2] -= stain

    noise = np.clip(noise, 15, 245).astype(np.uint8)
    return Image.fromarray(noise)

def draw_realistic_road_infrastructure(img: Image.Image, width=1000, height=1000, seed=42):
    """Draws realistic Indian urban road elements (curbs, zebra crossing, paver sidewalk, lane marks)."""
    draw = ImageDraw.Draw(img, "RGBA")
    np.random.seed(seed)

    # 1. Left Footpath with interlocking paver tile patterns
    footpath_w = 90
    draw.rectangle([(0, 0), (footpath_w, height)], fill=(145, 125, 110, 255))
    # Paver block gridlines
    for y in range(0, height, 18):
        draw.line([(0, y), (footpath_w, y)], fill=(110, 95, 80, 200), width=1)
    for x in range(0, footpath_w, 22):
        draw.line([(x, 0), (x, height)], fill=(110, 95, 80, 180), width=1)

    # 2. Right Roadside Gutter / Curb
    curb_x = width - 85
    draw.rectangle([(curb_x, 0), (width, height)], fill=(135, 130, 125, 255))
    draw.rectangle([(curb_x - 12, 0), (curb_x, height)], fill=(50, 48, 45, 255))  # Storm drain trench

    # 3. Curb edge beveled paint (Alternating Yellow & Black Indian municipal curb paint)
    curb_w = 12
    curb_left_x = footpath_w
    for y in range(0, height, 50):
        color = (235, 195, 35, 240) if (y // 50) % 2 == 0 else (35, 35, 35, 240)
        draw.rectangle([(curb_left_x, y), (curb_left_x + curb_w, y + 50)], fill=color)

    # 4. Center lane divider (Weathered broken white line with asphalt abrasion)
    center_x = width // 2
    for y in range(15, height, 75):
        # Slightly jagged weathered edge
        draw.rectangle([(center_x - 4, y), (center_x + 4, y + 42)], fill=(235, 235, 230, 230))

    # 5. Road edge solid white boundary lines
    draw.line([(footpath_w + 22, 0), (footpath_w + 22, height)], fill=(225, 220, 210, 200), width=5)
    draw.line([(curb_x - 22, 0), (curb_x - 22, height)], fill=(225, 220, 210, 200), width=5)

    # 6. Overhead tree branch shadow projection
    for _ in range(3):
        tx = np.random.randint(0, width // 3)
        ty = np.random.randint(0, height)
        draw.ellipse([(tx - 60, ty - 40), (tx + 90, ty + 60)], fill=(20, 25, 30, 75))

    return img

def add_realistic_indian_litter(img: Image.Image, num_items=18, width=1000, height=1000, seed=42):
    """Draws realistic high-density Indian street litter objects with depth & shadows."""
    draw = ImageDraw.Draw(img, "RGBA")
    np.random.seed(seed)

    for _ in range(num_items):
        # Bias litter clusters towards curbs, footpaths, and roadside storm trenches
        if np.random.rand() > 0.35:
            # Curb / road shoulder zone
            if np.random.rand() > 0.5:
                gx = np.random.randint(100, 240)
            else:
                gx = np.random.randint(width - 240, width - 95)
        else:
            # Scattered road surface
            gx = np.random.randint(180, width - 180)
            
        gy = np.random.randint(40, height - 50)
        
        item_type = np.random.choice([
            "polythene_bag", "gutkha_pouch", "water_bottle", 
            "chai_cup", "snack_wrapper", "coconut_husk", "cardboard"
        ], p=[0.28, 0.22, 0.18, 0.12, 0.10, 0.05, 0.05])

        # Drop shadow for every litter item
        shadow_off = 3
        
        if item_type == "polythene_bag":
            # Crinkled yellow/white plastic carry bag
            color_choice = np.random.choice(["yellow", "white", "cyan", "pink"])
            base_col = (245, 235, 140, 240) if color_choice == "yellow" else \
                       (240, 245, 250, 240) if color_choice == "white" else \
                       (100, 220, 240, 240) if color_choice == "cyan" else (240, 140, 190, 240)
            poly_pts = [
                (gx, gy),
                (gx + np.random.randint(18, 36), gy - np.random.randint(6, 14)),
                (gx + np.random.randint(30, 48), gy + np.random.randint(12, 28)),
                (gx + np.random.randint(10, 22), gy + np.random.randint(24, 40)),
                (gx - np.random.randint(4, 10), gy + np.random.randint(10, 20))
            ]
            # Shadow
            draw.polygon([(x + shadow_off, y + shadow_off) for x, y in poly_pts], fill=(20, 20, 25, 90))
            # Main bag
            draw.polygon(poly_pts, fill=base_col, outline=(190, 180, 120, 255))
            # Bag folds
            draw.line([poly_pts[0], poly_pts[2]], fill=(255, 255, 255, 180), width=1)
            draw.line([poly_pts[1], poly_pts[3]], fill=(160, 150, 100, 150), width=1)

        elif item_type == "gutkha_pouch":
            # Metallic red/gold pan masala sachet
            w_p = np.random.randint(14, 22)
            h_p = np.random.randint(18, 26)
            draw.rectangle([(gx + shadow_off, gy + shadow_off), (gx + w_p + shadow_off, gy + h_p + shadow_off)], fill=(15, 15, 20, 95))
            draw.rectangle([(gx, gy), (gx + w_p, gy + h_p)], fill=(225, 30, 30, 255), outline=(255, 215, 0, 255))
            # Silver / Gold foil diagonal band
            draw.line([(gx + 3, gy + h_p - 3), (gx + w_p - 3, gy + 3)], fill=(255, 230, 100, 255), width=3)

        elif item_type == "water_bottle":
            # Transparent / Blue PET bottle with cap
            bw = np.random.randint(14, 20)
            bh = np.random.randint(32, 46)
            draw.rounded_rectangle([(gx + shadow_off, gy + shadow_off), (gx + bw + shadow_off, gy + bh + shadow_off)], radius=4, fill=(15, 20, 25, 90))
            draw.rounded_rectangle([(gx, gy), (gx + bw, gy + bh)], radius=4, fill=(50, 175, 245, 220), outline=(230, 245, 255, 255))
            # Bottle cap
            draw.rectangle([(gx + 4, gy - 4), (gx + bw - 4, gy)], fill=(20, 70, 200, 255))
            # Highlights
            draw.line([(gx + 3, gy + 4), (gx + 3, gy + bh - 4)], fill=(255, 255, 255, 200), width=2)

        elif item_type == "chai_cup":
            # Discarded roadside paper tea cup
            cr = np.random.randint(9, 14)
            draw.ellipse([(gx - cr + shadow_off, gy - cr + shadow_off), (gx + cr + shadow_off, gy + cr + shadow_off)], fill=(15, 15, 20, 90))
            draw.ellipse([(gx - cr, gy - cr), (gx + cr, gy + cr)], fill=(230, 195, 145, 255), outline=(180, 140, 95, 255))
            draw.ellipse([(gx - cr + 3, gy - cr + 3), (gx + cr - 3, gy + cr - 3)], fill=(130, 85, 45, 255))

        elif item_type == "snack_wrapper":
            # Bright magenta/purple chip packet with shiny crinkles
            sw = np.random.randint(22, 34)
            sh = np.random.randint(16, 26)
            draw.rectangle([(gx + shadow_off, gy + shadow_off), (gx + sw + shadow_off, gy + sh + shadow_off)], fill=(15, 15, 20, 90))
            draw.rectangle([(gx, gy), (gx + sw, gy + sh)], fill=(225, 45, 170, 255), outline=(255, 255, 120, 255))
            draw.line([(gx + 4, gy + 4), (gx + sw - 4, gy + sh - 4)], fill=(255, 240, 200, 220), width=2)

        elif item_type == "coconut_husk":
            # Discarded tender coconut shell / husk
            cw = np.random.randint(26, 38)
            ch = np.random.randint(20, 28)
            draw.ellipse([(gx + shadow_off, gy + shadow_off), (gx + cw + shadow_off, gy + ch + shadow_off)], fill=(15, 15, 20, 95))
            draw.ellipse([(gx, gy), (gx + cw, gy + ch)], fill=(130, 85, 45, 255), outline=(85, 50, 25, 255))
            draw.ellipse([(gx + 7, gy + 5), (gx + cw - 7, gy + ch - 5)], fill=(75, 42, 20, 255))

        else:
            # Cardboard carton scrap
            cw = np.random.randint(30, 48)
            ch = np.random.randint(22, 36)
            draw.rectangle([(gx + shadow_off, gy + shadow_off), (gx + cw + shadow_off, gy + ch + shadow_off)], fill=(15, 15, 20, 90))
            draw.rectangle([(gx, gy), (gx + cw, gy + ch)], fill=(175, 135, 90, 255), outline=(130, 95, 60, 255))
            draw.line([(gx + 5, gy + 8), (gx + cw - 5, gy + 8)], fill=(110, 80, 50, 200), width=1)
            draw.line([(gx + 5, gy + 16), (gx + cw - 5, gy + 16)], fill=(110, 80, 50, 200), width=1)

    return img

def create_photorealistic_mangalore_frame(
    filename: str,
    location_title: str,
    lat: float,
    lng: float,
    litter_count: int,
    base_tone=65,
    seed=42
):
    """Generates complete high-resolution photorealistic drone overhead shot."""
    # 1. Base realistic asphalt texture
    img = generate_photorealistic_asphalt_texture(1000, 1000, base_tone=base_tone, seed=seed)
    # 2. Road infrastructure & markings
    img = draw_realistic_road_infrastructure(img, 1000, 1000, seed=seed)
    # 3. High density Indian street litter
    img = add_realistic_indian_litter(img, num_items=litter_count, width=1000, height=1000, seed=seed)
    
    # 4. Subtle lens vignette & slight aerial blur
    img = img.filter(ImageFilter.SMOOTH_MORE)
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.2)

    # 5. Embed Mangalore EXIF GPS tags
    exif = embed_gps_exif(img, lat, lng)
    save_path = os.path.join(SAMPLE_DIR, filename)
    img.save(save_path, format="JPEG", exif=exif, quality=96)
    print(f"Photorealistic Frame Ready [{location_title}]: {filename} -> Lat: {lat}, Lng: {lng} ({litter_count} items)")

def generate_full_realistic_mangalore_dataset():
    print("Generating High-Realism Mangaluru (Karnataka) Drone Aerial Cleanliness Survey Dataset...\n")
    
    # Zone 1: Mangaluru Central Market (Severe Hotspot - 2 Overlapping Angles)
    create_photorealistic_mangalore_frame(
        "mangaluru_central_market_frame_01.jpg",
        "Mangaluru Central Market - West Corridor",
        lat=12.8688, lng=74.8423,
        litter_count=26, base_tone=60, seed=201
    )
    create_photorealistic_mangalore_frame(
        "mangaluru_central_market_frame_02.jpg",
        "Mangaluru Central Market - East Gate",
        lat=12.8689, lng=74.8425,
        litter_count=21, base_tone=62, seed=202
    )

    # Zone 2: Hampankatta Commercial Corridor (High Pollution - 2 Overlapping Frames)
    create_photorealistic_mangalore_frame(
        "hampankatta_commercial_angle_a.jpg",
        "Hampankatta Main Cross - Flight Angle A",
        lat=12.8715, lng=74.8441,
        litter_count=18, base_tone=68, seed=203
    )
    create_photorealistic_mangalore_frame(
        "hampankatta_commercial_angle_b.jpg",
        "Hampankatta Main Cross - Flight Angle B",
        lat=12.8716, lng=74.8443,
        litter_count=15, base_tone=66, seed=204
    )

    # Zone 3: Bunder Old Port Wharf (Critical Industrial/Wholesale Hotspot - 2 Frames)
    create_photorealistic_mangalore_frame(
        "bunder_port_wharf_frame_01.jpg",
        "Bunder Port Fish & Wholesale Market Wharf",
        lat=12.8631, lng=74.8390,
        litter_count=32, base_tone=55, seed=205
    )
    create_photorealistic_mangalore_frame(
        "bunder_port_wharf_frame_02.jpg",
        "Bunder Old Dock Loading Bay",
        lat=12.8633, lng=74.8392,
        litter_count=28, base_tone=58, seed=206
    )

    # Zone 4: Kadri Temple Road (Moderate Pilgrimage Sector)
    create_photorealistic_mangalore_frame(
        "kadri_temple_road_frame.jpg",
        "Kadri Temple Road",
        lat=12.8872, lng=74.8580,
        litter_count=8, base_tone=72, seed=207
    )

    # Zone 5: Lalbagh Municipal Avenue (Clean Benchmark Zone)
    create_photorealistic_mangalore_frame(
        "lalbagh_mangaluru_circle.jpg",
        "Lalbagh Municipal Circle Avenue",
        lat=12.8805, lng=74.8420,
        litter_count=2, base_tone=75, seed=208
    )

    print(f"\nAll 8 photorealistic Mangalore aerial drone survey frames generated in: {SAMPLE_DIR}")

if __name__ == "__main__":
    generate_full_realistic_mangalore_dataset()
