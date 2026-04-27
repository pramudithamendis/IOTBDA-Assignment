# =========================================================
# API route for insights
# =========================================================

from fastapi import APIRouter
import pandas as pd
from pathlib import Path

from app.services.insights_service import generate_insights_from_df

router = APIRouter()

@router.get("/insights")
def get_insights():
    file_path = Path(__file__).resolve().parent.parent / "data" / "cluster_results.csv"

    if not file_path.exists():
        return {"insights": []}

    df = pd.read_csv(file_path)

    insights = generate_insights_from_df(df)

    return {
        "insights": insights
    }