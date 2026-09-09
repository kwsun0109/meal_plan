from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NEIS Backend API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEIS_API_KEY = os.getenv("NEIS_API_KEY")
ATPT_OFCDC_SC_CODE = os.getenv("ATPT_OFCDC_SC_CODE")
SD_SCHUL_CODE = os.getenv("SD_SCHUL_CODE")

meal_cache = {}
TIMETABLE_FILE = Path("timetable.json")

if not TIMETABLE_FILE.exists():
    with open(TIMETABLE_FILE, "w", encoding="utf-8") as f:
        json.dump({
            '2-3-월': ['문학', '확률과 통계', '영어 I', '한국사', '물리학 I', '체육', '동아리'],
            '2-3-화': ['영어 I', '문학', '화학 I', '수학 II', '정보', '음악', '진로활동'],
        }, f, ensure_ascii=False, indent=4)

@app.get("/api/meal")
async def get_meal(date: str):
    if date in meal_cache:
        return meal_cache[date]

    url = "https://open.neis.go.kr/hub/mealServiceDietInfo"
    params = {
        "KEY": NEIS_API_KEY,
        "Type": "json",
        "ATPT_OFCDC_SC_CODE": ATPT_OFCDC_SC_CODE,
        "SD_SCHUL_CODE": SD_SCHUL_CODE,
        "MLSV_YMD": date
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            data = response.json()
            
            if "RESULT" in data:
                return {"status": "error", "message": data["RESULT"]["MESSAGE"]}
                
            result = {"status": "success", "data": data}
            meal_cache[date] = result
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timetable")
async def get_timetable():
    try:
        with open(TIMETABLE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/timetable")
async def save_timetable(new_timetable: dict):
    try:
        with open(TIMETABLE_FILE, "w", encoding="utf-8") as f:
            json.dump(new_timetable, f, ensure_ascii=False, indent=4)
        return {"status": "success", "message": "시간표가 성공적으로 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))