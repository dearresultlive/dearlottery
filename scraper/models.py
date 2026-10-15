"""
Pydantic Data Models & Validation Schema for Dear Lottery Results.
Enforces strict digit counts, series format, prize tier counts, and data integrity.
"""

from typing import List, Optional, Dict, Any
import hashlib
import re
from datetime import date
from pydantic import BaseModel, Field, field_validator, model_validator


class FirstPrizeTicket(BaseModel):
    series: str = Field(..., description="Ticket series e.g. '84D' or '92B'")
    number: str = Field(..., description="5-digit winning number e.g. '19283'")

    @field_validator("series")
    @classmethod
    def validate_series(cls, v: str) -> str:
        v_clean = v.strip().upper()
        # Series is usually 1-2 digits followed by 1 letter (e.g., '84D', '9B', 'A', 'AB')
        if not re.match(r"^[0-9]{0,2}[A-Z]{1,2}$", v_clean):
            raise ValueError(f"Invalid lottery series format: '{v}'")
        return v_clean

    @field_validator("number")
    @classmethod
    def validate_number(cls, v: str) -> str:
        v_clean = v.strip()
        if not re.match(r"^\d{5}$", v_clean):
            raise ValueError(f"1st prize ticket number must be exactly 5 digits: '{v}'")
        return v_clean


class PrizeBreakdown(BaseModel):
    first_prize: FirstPrizeTicket
    consolation_prize_amount: int = 1000
    second_prize: List[str] = Field(..., description="10 winning 5-digit numbers")
    third_prize: List[str] = Field(..., description="10 winning 4-digit numbers")
    fourth_prize: List[str] = Field(..., description="10 winning 4-digit numbers")
    fifth_prize: List[str] = Field(..., description="100 winning 4-digit numbers")

    @field_validator("second_prize")
    @classmethod
    def validate_second_prize(cls, v: List[str]) -> List[str]:
        cleaned = [item.strip() for item in v]
        if len(cleaned) != 10:
            raise ValueError(f"2nd Prize must have exactly 10 numbers, received {len(cleaned)}")
        for num in cleaned:
            if not re.match(r"^\d{5}$", num):
                raise ValueError(f"2nd Prize number '{num}' must be exactly 5 digits")
        if len(set(cleaned)) != 10:
            raise ValueError("2nd Prize numbers must be 10 unique values")
        return sorted(cleaned)

    @field_validator("third_prize")
    @classmethod
    def validate_third_prize(cls, v: List[str]) -> List[str]:
        cleaned = [item.strip() for item in v]
        if len(cleaned) != 10:
            raise ValueError(f"3rd Prize must have exactly 10 numbers, received {len(cleaned)}")
        for num in cleaned:
            if not re.match(r"^\d{4}$", num):
                raise ValueError(f"3rd Prize number '{num}' must be exactly 4 digits")
        if len(set(cleaned)) != 10:
            raise ValueError("3rd Prize numbers must be 10 unique values")
        return sorted(cleaned)

    @field_validator("fourth_prize")
    @classmethod
    def validate_fourth_prize(cls, v: List[str]) -> List[str]:
        cleaned = [item.strip() for item in v]
        if len(cleaned) != 10:
            raise ValueError(f"4th Prize must have exactly 10 numbers, received {len(cleaned)}")
        for num in cleaned:
            if not re.match(r"^\d{4}$", num):
                raise ValueError(f"4th Prize number '{num}' must be exactly 4 digits")
        if len(set(cleaned)) != 10:
            raise ValueError("4th Prize numbers must be 10 unique values")
        return sorted(cleaned)

    @field_validator("fifth_prize")
    @classmethod
    def validate_fifth_prize(cls, v: List[str]) -> List[str]:
        cleaned = [item.strip() for item in v]
        if len(cleaned) != 100:
            raise ValueError(f"5th Prize must have exactly 100 numbers, received {len(cleaned)}")
        for num in cleaned:
            if not re.match(r"^\d{4}$", num):
                raise ValueError(f"5th Prize number '{num}' must be exactly 4 digits")
        if len(set(cleaned)) != 100:
            raise ValueError("5th Prize numbers must be 100 unique values")
        return sorted(cleaned)


class LotteryDrawResult(BaseModel):
    draw_id: str = Field(..., description="Unique composite ID e.g. '2026-10-13-1PM'")
    draw_date: str = Field(..., description="Draw date in YYYY-MM-DD format")
    draw_time: str = Field(..., description="'1:00 PM', '6:00 PM', or '8:00 PM'")
    draw_name: str = Field(..., description="Official draw title e.g. 'DEAR TEESTA MORNING'")
    draw_number: Optional[str] = Field(None, description="Official sequential draw number if available")
    prizes: PrizeBreakdown
    source_url: Optional[str] = Field(None, description="Original PDF or image URL")
    pdf_r2_url: Optional[str] = Field(None, description="Archived PDF URL in Cloudflare R2")
    image_r2_url: Optional[str] = Field(None, description="Archived Image URL in Cloudflare R2")
    checksum: Optional[str] = Field(None, description="SHA256 hash of result content for tamper verification")

    @field_validator("draw_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v.strip()):
            raise ValueError(f"Invalid date format '{v}', expected YYYY-MM-DD")
        return v.strip()

    @field_validator("draw_time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        valid_times = ["1:00 PM", "6:00 PM", "8:00 PM", "1PM", "6PM", "8PM"]
        norm = v.strip().upper()
        if "1" in norm and "PM" in norm:
            return "1:00 PM"
        elif "6" in norm and "PM" in norm:
            return "6:00 PM"
        elif "8" in norm and "PM" in norm:
            return "8:00 PM"
        raise ValueError(f"Invalid draw time '{v}'. Expected 1:00 PM, 6:00 PM, or 8:00 PM.")

    @model_validator(mode="after")
    def compute_integrity(self) -> "LotteryDrawResult":
        # Generate composite draw_id if not matching convention
        time_token = "1PM" if "1" in self.draw_time else ("6PM" if "6" in self.draw_time else "8PM")
        expected_id = f"{self.draw_date}-{time_token}"
        if self.draw_id != expected_id:
            self.draw_id = expected_id

        # Compute SHA256 checksum across critical payload
        payload_repr = (
            f"{self.draw_id}|{self.prizes.first_prize.series}|{self.prizes.first_prize.number}|"
            f"{','.join(self.prizes.second_prize)}|"
            f"{','.join(self.prizes.third_prize)}|"
            f"{','.join(self.prizes.fourth_prize)}|"
            f"{','.join(self.prizes.fifth_prize)}"
        )
        self.checksum = hashlib.sha256(payload_repr.encode("utf-8")).hexdigest()
        return self

    def to_flat_prize_records(self) -> List[Dict[str, Any]]:
        """
        Converts the hierarchical prize breakdown into flat relational records
        ready for direct bulk insertion into Cloudflare D1 `prizes` table.
        """
        records: List[Dict[str, Any]] = []

        # 1st Prize
        records.append({
            "draw_id": self.draw_id,
            "prize_rank": "1st",
            "prize_amount": 10000000,
            "ticket_number": self.prizes.first_prize.number,
            "last_digits": self.prizes.first_prize.number[-4:],
            "series": self.prizes.first_prize.series
        })

        # Consolation Prize
        records.append({
            "draw_id": self.draw_id,
            "prize_rank": "Consolation",
            "prize_amount": 1000,
            "ticket_number": self.prizes.first_prize.number,
            "last_digits": self.prizes.first_prize.number[-4:],
            "series": "ALL_OTHER"
        })

        # 2nd Prize (10 numbers)
        for num in self.prizes.second_prize:
            records.append({
                "draw_id": self.draw_id,
                "prize_rank": "2nd",
                "prize_amount": 10000,
                "ticket_number": num,
                "last_digits": num[-4:],
                "series": None
            })

        # 3rd Prize (10 numbers)
        for num in self.prizes.third_prize:
            records.append({
                "draw_id": self.draw_id,
                "prize_rank": "3rd",
                "prize_amount": 500,
                "ticket_number": num,
                "last_digits": num,
                "series": None
            })

        # 4th Prize (10 numbers)
        for num in self.prizes.fourth_prize:
            records.append({
                "draw_id": self.draw_id,
                "prize_rank": "4th",
                "prize_amount": 250,
                "ticket_number": num,
                "last_digits": num,
                "series": None
            })

        # 5th Prize (100 numbers)
        for num in self.prizes.fifth_prize:
            records.append({
                "draw_id": self.draw_id,
                "prize_rank": "5th",
                "prize_amount": 120,
                "ticket_number": num,
                "last_digits": num,
                "series": None
            })

        return records
