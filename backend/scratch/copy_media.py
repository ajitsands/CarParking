import shutil

src1 = r"C:\Users\Dell\.gemini\antigravity-ide\brain\c6ed88d1-7b1d-4700-ae4e-f4d2072108e3\live_gate_exit_completed_1789026389076.png"
dst1 = r"e:\parkingsolution\development_files\live_gate_exit_completed.png"

src2 = r"C:\Users\Dell\.gemini\antigravity-ide\brain\c6ed88d1-7b1d-4700-ae4e-f4d2072108e3\parking_sessions_completed_1789026463538.png"
dst2 = r"e:\parkingsolution\development_files\parking_sessions_completed.png"

shutil.copyfile(src1, dst1)
shutil.copyfile(src2, dst2)
print("Copied screenshots successfully!")
