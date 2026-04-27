# =========================================================
# Service to generate user-friendly rule-based insights
# =========================================================

import pandas as pd

def generate_insights_from_df(df: pd.DataFrame):
    insights = []

    # =========================
    # 0. Safety checks
    # =========================
    if df is None or df.empty:
        return [{
            "title": "No Data Available",
            "description": "Sleep data is not available yet.",
            "type": "warning"
        }]

    # Clean column names (important)
    df.columns = df.columns.str.strip()

    # =========================
    # 1. Cluster-based insights (primary)
    # =========================
    if "cluster_name" in df.columns:
        cluster_counts = df["cluster_name"].value_counts()
        total = len(df)

        for cluster, count in cluster_counts.items():
            percentage = (count / total) * 100

            # 🌙 Good Sleep
            if cluster == "Good Sleep":
                insights.append({
                    "title": "😴 Restful Sleep",
                    "description": "Most of your recent sleep sessions were calm and well-balanced.",
                    "type": "positive"
                })

            # ⚠ Light Sleep
            elif cluster == "Light Sleep":
                insights.append({
                    "title": "⚠ Light Sleep Detected",
                    "description": "Some of your sleep sessions were light and may not feel fully refreshing.",
                    "type": "warning"
                })

            # 🚨 Disturbed Sleep
            elif cluster == "Disturbed Sleep":
                insights.append({
                    "title": "🚨 Disturbed Sleep",
                    "description": "You experienced interruptions during sleep, possibly due to noise or movement.",
                    "type": "warning"
                })

    # =========================
    # 2. Feature-based insights (simple rules)
    # =========================
    try:
        avg_noise = df["sound_std"].mean()
        avg_motion = df["motion_rate"].mean()
        avg_light = df["light_avg"].mean()

        # 🔊 Noise
        if avg_noise < 0.1:
            insights.append({
                "title": "🌙 Quiet Environment",
                "description": "Your sleeping environment is generally quiet — great for deep sleep.",
                "type": "positive"
            })
        else:
            insights.append({
                "title": "🔊 Noise Alert",
                "description": "Noise levels were slightly high and may affect your sleep quality.",
                "type": "warning"
            })

        # 🏃 Movement
        if avg_motion > 0.1:
            insights.append({
                "title": "🏃 Restlessness Detected",
                "description": "Frequent movement was detected, which may indicate restless sleep.",
                "type": "warning"
            })

        # 💡 Light
        if avg_light < 0.05:
            insights.append({
                "title": "💡 Optimal Lighting",
                "description": "Your room lighting is well-suited for better sleep.",
                "type": "positive"
            })
        else:
            insights.append({
                "title": "💡 Light Exposure",
                "description": "Higher light levels may be affecting your ability to fall into deep sleep.",
                "type": "warning"
            })

    except Exception as e:
        print("Feature-based insight error:", e)

    # =========================
    # 3. Ensure at least 1 insight
    # =========================
    if len(insights) == 0:
        insights.append({
            "title": "Sleep Monitoring Active",
            "description": "We are currently analyzing your sleep patterns.",
            "type": "positive"
        })

    return insights