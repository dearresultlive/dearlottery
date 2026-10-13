"""
High-fidelity authentic sample draw generator and test data.
Accurately replicates official Dear Lottery result layouts for 1PM, 6PM, and 8PM draws.
"""

from typing import Dict, Any, List
import random
from datetime import datetime


def generate_mock_draw(date_str: str, time_slot: str) -> Dict[str, Any]:
    """
    Generates an authentic Dear Lottery draw dataset compliant with official prize guidelines.
    time_slot: '1PM', '6PM', or '8PM'
    """
    names = {
        "1PM": "DEAR TEESTA MORNING",
        "6PM": "DEAR DESERT DAY",
        "8PM": "DEAR SEAGULL NIGHT"
    }
    time_labels = {
        "1PM": "1:00 PM",
        "6PM": "6:00 PM",
        "8PM": "8:00 PM"
    }

    # Deterministic random seed based on date and time for reproducible mock data
    seed_val = int(date_str.replace("-", "")) + (100 if time_slot == "1PM" else (200 if time_slot == "6PM" else 300))
    rng = random.Random(seed_val)

    # 1st Prize: Series + 5 digits
    series_pool = ["84D", "92B", "75K", "61A", "53E", "99L", "42G", "88C", "71J", "66H"]
    first_series = rng.choice(series_pool)
    first_num = f"{rng.randint(10000, 99999):05d}"

    # 2nd Prize: 10 five-digit numbers
    second_prize = []
    while len(second_prize) < 10:
        candidate = f"{rng.randint(10000, 99999):05d}"
        if candidate != first_num and candidate not in second_prize:
            second_prize.append(candidate)

    # 3rd Prize: 10 four-digit numbers
    third_prize = []
    while len(third_prize) < 10:
        candidate = f"{rng.randint(1000, 9999):04d}"
        if candidate not in third_prize:
            third_prize.append(candidate)

    # 4th Prize: 10 four-digit numbers
    fourth_prize = []
    while len(fourth_prize) < 10:
        candidate = f"{rng.randint(1000, 9999):04d}"
        if candidate not in third_prize and candidate not in fourth_prize:
            fourth_prize.append(candidate)

    # 5th Prize: 100 four-digit numbers
    fifth_prize = []
    while len(fifth_prize) < 100:
        candidate = f"{rng.randint(1000, 9999):04d}"
        if candidate not in fifth_prize:
            fifth_prize.append(candidate)

    return {
        "draw_id": f"{date_str}-{time_slot}",
        "draw_date": date_str,
        "draw_time": time_labels[time_slot],
        "draw_name": names[time_slot],
        "draw_number": f"{rng.randint(100, 999)}",
        "prizes": {
            "first_prize": {
                "series": first_series,
                "number": first_num
            },
            "consolation_prize_amount": 1000,
            "second_prize": sorted(second_prize),
            "third_prize": sorted(third_prize),
            "fourth_prize": sorted(fourth_prize),
            "fifth_prize": sorted(fifth_prize)
        },
        "source_url": f"https://www.nagalandlotteries.com/results/{date_str}_{time_slot}.pdf",
        "pdf_r2_url": f"https://cdn.dearresultlive.in/archive/{date_str}/{time_slot}.pdf",
        "image_r2_url": f"https://cdn.dearresultlive.in/archive/{date_str}/{time_slot}.jpg"
    }


def generate_mock_pdf_text(draw_data: Dict[str, Any]) -> str:
    """
    Renders raw formatted lottery sheet text mimicking official Nagaland Lottery result PDF.
    Useful for testing OCR and text extraction parsers.
    """
    p = draw_data["prizes"]
    text = f"""
    GOVERNMENT OF NAGALAND
    DIRECTORATE OF STATE LOTTERIES
    {draw_data['draw_name']} {draw_data['draw_time']}
    Draw Date: {datetime.strptime(draw_data['draw_date'], '%Y-%m-%d').strftime('%d-%m-%Y')}
    
    1st Prize Amount Rs. 1 Crore: {p['first_prize']['series']} {p['first_prize']['number']}
    Consolation Prize Amount Rs. 1,000/- : {p['first_prize']['number']} (Remaining All Serial & Series)
    
    2nd Prize Amount Rs. 9,000/-
    {' '.join(p['second_prize'][:5])}
    {' '.join(p['second_prize'][5:])}
    
    3rd Prize Amount Rs. 450/-
    {' '.join(p['third_prize'][:5])}
    {' '.join(p['third_prize'][5:])}
    
    4th Prize Amount Rs. 250/-
    {' '.join(p['fourth_prize'][:5])}
    {' '.join(p['fourth_prize'][5:])}
    
    5th Prize Amount Rs. 120/-
    """
    for i in range(0, 100, 10):
        text += "    " + " ".join(p['fifth_prize'][i:i+10]) + "\n"

    text += "\nISSUED BY: THE DIRECTOR, NAGALAND STATE LOTTERIES"
    return text
