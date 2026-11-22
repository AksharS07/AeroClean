import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path="AeroClean_Pitch_Deck.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)  # 16:9 Widescreen

    blank_layout = prs.slide_layouts[6]

    # Theme Colors
    BG_DARK = RGBColor(11, 17, 30)         # #0B111E
    CARD_BG = RGBColor(18, 27, 47)         # #121B2F
    CARD_BORDER = RGBColor(37, 56, 94)     # #25385E
    TEXT_WHITE = RGBColor(255, 255, 255)
    TEXT_MUTED = RGBColor(156, 163, 175)   # #9CA3AF
    ACCENT_BLUE = RGBColor(56, 189, 248)   # #38BDF8
    ACCENT_CYAN = RGBColor(6, 182, 212)    # #06B6D4
    ACCENT_GREEN = RGBColor(16, 185, 129)  # #10B981
    ACCENT_AMBER = RGBColor(245, 158, 11)  # #F59E0B
    ACCENT_RED = RGBColor(239, 68, 68)     # #EF4444

    def apply_bg(slide):
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = BG_DARK
        bg_shape.line.fill.background()
        return bg_shape

    def add_card(slide, left, top, width, height, fill_color=CARD_BG, border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = fill_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        return card

    def add_header(slide, category, title, subtitle=None):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(11.7), Inches(1.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = category.upper()
        p0.font.size = Pt(10)
        p0.font.bold = True
        p0.font.color.rgb = ACCENT_BLUE

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.size = Pt(26)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_WHITE

        if subtitle:
            p2 = tf.add_paragraph()
            p2.text = subtitle
            p2.font.size = Pt(12)
            p2.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------------------
    # SLIDE 1: Title Slide
    # -------------------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    apply_bg(s1)

    # Accent decorative banner card
    add_card(s1, Inches(0.8), Inches(1.2), Inches(11.733), Inches(5.1), fill_color=RGBColor(14, 22, 38))

    tb = s1.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.3), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "AEROCLEAN"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = ACCENT_BLUE

    p2 = tf.add_paragraph()
    p2.text = "Autonomous Drone Garbage Index Mapping & Urban AI Intelligence"
    p2.font.size = Pt(22)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(8)

    p3 = tf.add_paragraph()
    p3.text = "Transforming municipal sanitation audits with aerial computer vision, standardized 0–100 Garbage Index (GI) heatmaps, and continuous active-learning AI."
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(14)

    # Badges row
    p4 = tf.add_paragraph()
    p4.text = " Mangaluru Smart City Pilot   •    YOLOv8 Edge Vision   •    Continuous Active Learning   •    Decoupled Municipal SaaS"
    p4.font.size = Pt(11)
    p4.font.bold = True
    p4.font.color.rgb = ACCENT_GREEN
    p4.space_before = Pt(24)

    # -------------------------------------------------------------------------
    # SLIDE 2: The Problem
    # -------------------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    apply_bg(s2)
    add_header(s2, "Urban Sanitation Challenge", "The Blind Spots in Municipal Cleanliness Monitoring", 
               "Manual inspection fails across modern Indian urban terrain and topography.")

    cards_data_s2 = [
        ("Manual & Subjective Audits", 
         "Sanitation inspectors inspect ground areas on foot or two-wheelers. Assessments are slow, sample less than 5% of roads, and are heavily prone to human bias and inconsistent reporting.",
         ACCENT_RED),
        ("Inaccessible Dumping Hotspots", 
         "Over 40% of critical waste piles accumulate in steep roadside slopes, railway embankments, forest fringes, and drainage canals where ground workers cannot easily survey.",
         ACCENT_AMBER),
        ("Lack of Normalized Data", 
         "Cities have no unified quantitative cleanliness metric. Budgets and cleanup fleets are deployed reactively after public citizen complaints rather than via predictive geospatial audits.",
         ACCENT_BLUE)
    ]

    for i, (title, desc, color) in enumerate(cards_data_s2):
        x = Inches(0.8 + i * 3.98)
        add_card(s2, x, Inches(2.1), Inches(3.78), Inches(4.5))
        tb = s2.shapes.add_textbox(x + Inches(0.3), Inches(2.4), Inches(3.18), Inches(3.9))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = f"0{i+1}"
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = color
        
        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(16)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE
        p2.space_before = Pt(8)
        
        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(12)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(12)

    # -------------------------------------------------------------------------
    # SLIDE 3: The Solution
    # -------------------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    apply_bg(s3)
    add_header(s3, "Our Innovation", "AeroClean: From Drone Video to Municipal Action in Minutes", 
               "An automated end-to-end aerial pipeline converting drone photos into geospatial cleanliness intelligence.")

    steps = [
        ("1. Aerial Capture", "Commercial or survey drones fly automated survey routes over city corridors, slopes, and markets."),
        ("2. EXIF Grounding", "Telemetry engine extracts Latitude, Longitude, Altitude, Heading without fabricating false precision."),
        ("3. Indian Waste CV", "Specialized computer vision identifies gutkha pouches, PET bottles, chai cups, plastic bags, and sacks."),
        ("4. 0–100 GI Scoring", "Standardized formula computes normalized Garbage Index with 20m spatial grid deduplication."),
        ("5. Municipal Action", "Interactive heatmap with fly-to zone inspection provides cleaning crews exact coordinates and photo proofs.")
    ]

    for i, (stitle, sdesc) in enumerate(steps):
        y = Inches(2.1 + i * 0.95)
        add_card(s3, Inches(0.8), y, Inches(11.733), Inches(0.82))
        tb = s3.shapes.add_textbox(Inches(1.1), y + Inches(0.12), Inches(11.1), Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = f"{stitle}  —  "
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = ACCENT_BLUE
        
        run = p.add_run()
        run.text = sdesc
        run.font.size = Pt(12)
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------------------
    # SLIDE 4: Standardized Garbage Index & Scoring
    # -------------------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    apply_bg(s4)
    add_header(s4, "Scientific Cleanliness Standard", "The Normalized 0–100 Garbage Index (GI)", 
               "Moving municipalities from subjective impressions to an objective, actionable data standard.")

    gi_ranges = [
        ("0 – 25", "CLEAN STANDARD", ACCENT_GREEN, "Pristine urban corridors, clean pavements, zero scattered plastic or organic waste mounds. Priority: Routine Maintenance."),
        ("26 – 50", "MODERATE LITTER", ACCENT_AMBER, "Dispersed single-use plastics, occasional paper cups or snack wrappers. Priority: Scheduled sweeping shift."),
        ("51 – 75", "HIGH ACCUMULATION", RGBColor(249, 115, 22), "Dense plastic clustering, overflowing curbside waste, construction debris. Priority: Daily deployment required."),
        ("76 – 100", "CRITICAL HOTSPOT", ACCENT_RED, "Severe dump mounds on slopes/embankments requiring heavy machinery, loaders, and urgent sanitization.")
    ]

    for i, (score, label, col, desc) in enumerate(gi_ranges):
        x = Inches(0.8 + i * 2.98)
        add_card(s4, x, Inches(2.1), Inches(2.78), Inches(4.5))
        tb = s4.shapes.add_textbox(x + Inches(0.25), Inches(2.35), Inches(2.28), Inches(4.0))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = score
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = col

        p2 = tf.add_paragraph()
        p2.text = label
        p2.font.size = Pt(11)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE
        p2.space_before = Pt(4)

        p3 = tf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(11)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(12)

    # -------------------------------------------------------------------------
    # SLIDE 5: Dual Architecture System
    # -------------------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    apply_bg(s5)
    add_header(s5, "Platform Architecture", "Decoupled Dual-System: Operations & Continuous AI", 
               "Keeps municipal production maps lightning-fast while giving AI researchers an isolated training laboratory.")

    # System A Card
    add_card(s5, Inches(0.8), Inches(2.1), Inches(5.7), Inches(4.5))
    tb_a = s5.shapes.add_textbox(Inches(1.1), Inches(2.3), Inches(5.1), Inches(4.1))
    tf_a = tb_a.text_frame
    tf_a.word_wrap = True
    
    p = tf_a.paragraphs[0]
    p.text = "SYSTEM A: PRODUCTION MISSION MAP"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN

    items_a = [
        "Interactive Geospatial Leaflet Heatmap & Flight Trajectory",
        "20m x 20m Spatial Grid Binning to deduplicate overlapping flight frames",
        "Hover Zone Quick-Peek & Fly-To Multi-Angle Zone Deep Evaluation",
        "Actionable Municipal Cleanliness Dashboard & Audit Reports",
        "Zero-latency inference calling active validated production model"
    ]
    for it in items_a:
        p_it = tf_a.add_paragraph()
        p_it.text = f"• {it}"
        p_it.font.size = Pt(11)
        p_it.font.color.rgb = TEXT_MUTED
        p_it.space_before = Pt(8)

    # System B Card
    add_card(s5, Inches(6.8), Inches(2.1), Inches(5.7), Inches(4.5))
    tb_b = s5.shapes.add_textbox(Inches(7.1), Inches(2.3), Inches(5.1), Inches(4.1))
    tf_b = tb_b.text_frame
    tf_b.word_wrap = True
    
    p = tf_b.paragraphs[0]
    p.text = "SYSTEM B: AI MODEL STUDIO & LAB"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    items_b = [
        "Human-in-the-Loop (HITL) Studio with visual provenance tracking",
        "Strict rule: AI predictions are NEVER silently converted to ground truth",
        "Perceptual dHash Leakage Shield preventing overfitted test splits",
        "Ultralytics YOLO Training Hub with immutable dataset versioning",
        "Model Registry & Benchmark Progression with explicit human promotion"
    ]
    for it in items_b:
        p_it = tf_b.add_paragraph()
        p_it.text = f"• {it}"
        p_it.font.size = Pt(11)
        p_it.font.color.rgb = TEXT_MUTED
        p_it.space_before = Pt(8)

    # -------------------------------------------------------------------------
    # SLIDE 6: Field Validation - Mangaluru Pilot Trial
    # -------------------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    apply_bg(s6)
    add_header(s6, "Field Validation", "Mangaluru Smart City Pilot Trial & Ground Truth", 
               "Trained and evaluated on authentic real-world Indian laterite soils, slopes, and commercial zones.")

    stats_cards = [
        ("13+", "Survey Zones", "Covering Hampankatta, Central Market, Bunder Port, Kadri, Lalbagh"),
        ("460+", "Verified Annotations", "Human-approved plastic bottles, gutkha pouches, wrappers, organic waste"),
        ("92.9%", "mAP@50 Accuracy", "Benchmarked on constant held-out test frames without data leakage"),
        ("<80ms", "Inference Latency", "Real-time edge ready for lightweight onboard drone processors")
    ]

    for i, (stat, stitle, sdesc) in enumerate(stats_cards):
        x = Inches(0.8 + i * 2.98)
        add_card(s6, x, Inches(2.1), Inches(2.78), Inches(2.0))
        tb = s6.shapes.add_textbox(x + Inches(0.2), Inches(2.2), Inches(2.38), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = stat
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = ACCENT_BLUE

        p2 = tf.add_paragraph()
        p2.text = stitle
        p2.font.size = Pt(12)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE

        p3 = tf.add_paragraph()
        p3.text = sdesc
        p3.font.size = Pt(10)
        p3.font.color.rgb = TEXT_MUTED

    # Bottom summary card
    add_card(s6, Inches(0.8), Inches(4.35), Inches(11.733), Inches(2.25))
    tb_sum = s6.shapes.add_textbox(Inches(1.1), Inches(4.55), Inches(11.1), Inches(1.9))
    tf_sum = tb_sum.text_frame
    tf_sum.word_wrap = True

    p = tf_sum.paragraphs[0]
    p.text = "REAL-WORLD TERRAIN & WASTE ADAPTATION"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    p2 = tf_sum.add_paragraph()
    p2.text = "Traditional computer vision models trained on Western datasets fail on Indian urban streets due to laterite red clay soil, high-density non-branded plastic pouches, coconut shells, and overhead foliage. AeroClean's domain-specific detector achieves high accuracy even on steep drainage slopes and unpaved embankment dump sites."
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 7: Active Learning & Data Quality Shield
    # -------------------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    apply_bg(s7)
    add_header(s7, "Continuous AI Quality", "Active Learning with Zero Data Contamination", 
               "How AeroClean guarantees true generalization instead of hallucinated improvements.")

    q_cards = [
        ("Perceptual dHash Leakage Shield",
         "Near-duplicate drone frames captured milliseconds apart have identical visual features. AeroClean calculates 64-bit difference hashes (dHash) and clusters pairs with Hamming distance <= 6 to ensure they are never split across train and validation sets.",
         ACCENT_BLUE),
        ("Human-in-the-Loop Integrity",
         "Detections are visually categorized into AI Prediction (blue dashed), Human-Approved Ground Truth (green solid), and Human-Corrected (amber solid). AI proposals cannot pollute ground truth without manual inspector validation.",
         ACCENT_CYAN),
        ("Constant Held-Out Benchmark",
         "Model progression charts evaluate new checkpoints exclusively against an unpolluted held-out benchmark test set. A model is only promoted if mAP metrics verifiably beat the incumbent production model.",
         ACCENT_GREEN)
    ]

    for i, (title, desc, color) in enumerate(q_cards):
        x = Inches(0.8 + i * 3.98)
        add_card(s7, x, Inches(2.1), Inches(3.78), Inches(4.5))
        tb = s7.shapes.add_textbox(x + Inches(0.25), Inches(2.35), Inches(3.28), Inches(4.0))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = color

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(12)
        p2.font.color.rgb = TEXT_MUTED
        p2.space_before = Pt(12)

    # -------------------------------------------------------------------------
    # SLIDE 8: Value Proposition & Impact
    # -------------------------------------------------------------------------
    s8 = prs.slides.add_slide(blank_layout)
    apply_bg(s8)
    add_header(s8, "Business & Civic Value", "Measurable Municipal ROI & Smart City Impact", 
               "Aligning with national Swachh Bharat Mission 2.0 and Smart Cities Mission initiatives.")

    vals = [
        ("10x Faster Audits", "Survey an entire ward in 25 minutes instead of 3 days of manual walk-throughs.", ACCENT_GREEN),
        ("60% Cost Reduction", "Optimize fuel and truck routes by dispatching waste collectors only to verified hotspots.", ACCENT_BLUE),
        ("Verifiable Audit Trail", "EXIF-grounded before-and-after photo evidence protects against contractor fraud.", ACCENT_CYAN),
        ("Public Transparency", "Publish ward cleanliness indices on citizen portals to foster civic engagement and accountability.", ACCENT_AMBER)
    ]

    for i, (vtitle, vdesc, col) in enumerate(vals):
        row = i // 2
        col_idx = i % 2
        x = Inches(0.8 + col_idx * 5.95)
        y = Inches(2.1 + row * 2.3)
        add_card(s8, x, y, Inches(5.75), Inches(2.05))
        tb = s8.shapes.add_textbox(x + Inches(0.3), y + Inches(0.25), Inches(5.15), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = vtitle
        p.font.size = Pt(18)
        p.font.bold = True
        p.font.color.rgb = col

        p2 = tf.add_paragraph()
        p2.text = vdesc
        p2.font.size = Pt(12)
        p2.font.color.rgb = TEXT_MUTED
        p2.space_before = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 9: Roadmap & Future Vision
    # -------------------------------------------------------------------------
    s9 = prs.slides.add_slide(blank_layout)
    apply_bg(s9)
    add_header(s9, "Future Trajectory", "From Aerial Detection to Autonomous Urban Sanitation", 
               "Expanding AeroClean into a predictive municipal infrastructure operating system.")

    phases = [
        ("Phase 1 (Current)", "Aerial Survey & GI Heatmaps", "Pilot deployed in Mangaluru. Full EXIF GPS extraction, 20m grid binning, and active learning studio."),
        ("Phase 2 (Near-Term)", "Photogrammetry & Orthomosaics", "Integration with WebODM to project centimeter-level sub-meter GPS coordinates onto unified 3D orthophotos."),
        ("Phase 3 (Mid-Term)", "Automated Sweeper Routing", "Auto-generate optimal GPS dispatch routes directly into municipal garbage truck navigation terminals."),
        ("Phase 4 (Long-Term)", "Autonomous Drone Docks", "Self-charging drone rooftop docking stations running scheduled sunrise surveys without human pilots.")
    ]

    for i, (phase, ptitle, pdesc) in enumerate(phases):
        x = Inches(0.8 + i * 2.98)
        add_card(s9, x, Inches(2.1), Inches(2.78), Inches(4.5))
        tb = s9.shapes.add_textbox(x + Inches(0.25), Inches(2.35), Inches(2.28), Inches(4.0))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = phase
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_BLUE

        p2 = tf.add_paragraph()
        p2.text = ptitle
        p2.font.size = Pt(14)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE
        p2.space_before = Pt(6)

        p3 = tf.add_paragraph()
        p3.text = pdesc
        p3.font.size = Pt(11)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(10)

    # -------------------------------------------------------------------------
    # SLIDE 10: Summary / Call To Action
    # -------------------------------------------------------------------------
    s10 = prs.slides.add_slide(blank_layout)
    apply_bg(s10)

    add_card(s10, Inches(0.8), Inches(1.2), Inches(11.733), Inches(5.1), fill_color=RGBColor(14, 22, 38))
    tb_end = s10.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.3), Inches(3.8))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True

    p = tf_end.paragraphs[0]
    p.text = "AEROCLEAN"
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = ACCENT_BLUE

    p2 = tf_end.add_paragraph()
    p2.text = "Empowering Cleaner, Smarter Cities from Above"
    p2.font.size = Pt(22)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(8)

    p3 = tf_end.add_paragraph()
    p3.text = "Ready for pilot deployment across smart cities and municipal corporations. Let's make urban waste auditing fast, transparent, and autonomous."
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(14)

    p4 = tf_end.add_paragraph()
    p4.text = "Contact: team@aeroclean.ai   |   GitHub / Repo: aeroclean   |   Mangaluru Smart City Pilot"
    p4.font.size = Pt(12)
    p4.font.bold = True
    p4.font.color.rgb = ACCENT_GREEN
    p4.space_before = Pt(28)

    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "AeroClean_Pitch_Deck.pptx"
    create_deck(out)
