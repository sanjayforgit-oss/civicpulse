import json
import os
import sys

transcript_path = r"C:\Users\sanja\.gemini\antigravity-ide\brain\a2a9fe3d-7875-41b5-a607-b12e39e924e2\.system_generated\logs\transcript.jsonl"
output_md = r"d:\civicpulse\PREVIOUS_CHAT_HISTORY.md"

if not os.path.exists(transcript_path):
    print("Transcript path does not exist!")
    sys.exit(1)

messages = []
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            entry_type = entry.get("type")
            source = entry.get("source")
            content = entry.get("content", "")
            
            if entry_type == "USER_INPUT" and content:
                messages.append(f"### 👤 USER\n\n{content}\n\n---\n")
            elif source == "MODEL" and entry_type == "PLANNER_RESPONSE" and content:
                messages.append(f"### 🤖 ASSISTANT\n\n{content}\n\n---\n")
        except Exception as e:
            pass

with open(output_md, "w", encoding="utf-8") as f:
    f.write("# 📜 Previous Conversation Chat History\n\n")
    f.write(f"*Extracted from session `a2a9fe3d-7875-41b5-a607-b12e39e924e2`*\n\n---\n\n")
    f.write("\n".join(messages))

print(f"Successfully exported {len(messages)} messages to {output_md}")
