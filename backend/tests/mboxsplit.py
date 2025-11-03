import mailbox
import os

input_file = "/Users/edoardo/Documents/LocalAI/backend/tests/mbox"  # Path to your 4GB MBOX
output_dir = "/Users/edoardo/Documents/LocalAI/backend/mbox_parts"  # Folder for split files
num_parts = 10

# Create output folder if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Open the large MBOX
mbox = mailbox.mbox(input_file)
total_msgs = len(mbox)
msgs_per_file = total_msgs // num_parts + 1

for i in range(num_parts):
    part_name = os.path.join(output_dir, f"part_{i+1}.mbox")
    part_mbox = mailbox.mbox(part_name)
    part_mbox.lock()
    
    start = i * msgs_per_file
    end = min(start + msgs_per_file, total_msgs)

    print(f"Creating {part_name} with messages {start}–{end-1}")

    # ✅ FIXED LINE — iterate by index instead of slicing
    for idx in range(start, end):
        part_mbox.add(mbox[idx])

    part_mbox.flush()
    part_mbox.close()

print(f"Splitting done! Created {num_parts} MBOX files in '{output_dir}'")
