import os
from google import genai
from google.genai import types

# ====== INIT CLIENT ======

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not set in environment variables.")

client = genai.Client(api_key=API_KEY)


# ====== MAIN AI FUNCTION ======

def run_ai(prompt: str, context: str = "") -> str:
    """
    prompt  : câu lệnh người dùng nhập
    context : world data / rag context / editor content
    """

    system_prompt = """
    Bạn là một AI hỗ trợ viết truyện dài hạn trong cùng một vũ trụ.

    Nguyên tắc:

    1. Canon là nền tảng. Tránh mâu thuẫn với các sự kiện, luật thế giới hoặc tính cách nhân vật đã được cung cấp.

    2. Tuy nhiên, bạn được phép sáng tạo mở rộng:
    - Chiêu thức mới
    - Cách vận dụng năng lượng
    - Tình huống chiến đấu
    - Cảm xúc, nội tâm
    - Hình ảnh, ẩn dụ
    miễn là không phá vỡ logic cốt lõi của thế giới.

    3. Trong các cảnh chiến đấu:
    - Ưu tiên sự kịch tính, tốc độ, nhịp điệu.
    - Sáng tạo chiêu thức và cách tương tác năng lượng một cách tự nhiên.
    - Mô tả không gian, âm thanh, áp lực, chuyển động.
    - Không lặp lại mô-típ cũ nếu có thể biến tấu tốt hơn, có thể đột phá.

    4. Nếu thiếu dữ kiện quan trọng ảnh hưởng trực tiếp đến logic, bạn có thể:
    - Tự đưa ra một giả định hợp lý dựa trên canon,
    - Hoặc hỏi lại nếu mâu thuẫn quá lớn.

    5. Văn phong:
    - Mạch lạc
    - Giàu hình ảnh
    - Cảm xúc sâu
    - Có nhịp điệu
    - Không khô cứng

    Hãy viết như một tiểu thuyết thực thụ, không phải bản tóm tắt.
    """

    full_input = f"""
=== CANON CONTEXT ===
{context}

=== USER REQUEST ===
{prompt}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=system_prompt + full_input,
            config=types.GenerateContentConfig(
                temperature=0.8,
                top_p=0.95,
            ),
        )

        return response.text

    except Exception as e:
        return f"[AI ERROR]: {str(e)}"


# ====== OPTIONAL CLI MODE ======
# Cho phép test trực tiếp bằng terminal nếu muốn

if __name__ == "__main__":
    print("=== Storii AI Writer CLI ===")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("Prompt: ")

        if user_input.lower() == "exit":
            break

        result = run_ai(user_input)
        print("\n--- AI RESPONSE ---\n")
        print(result)
        print("\n")
