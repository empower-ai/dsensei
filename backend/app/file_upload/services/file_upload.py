import hashlib
import os
import shutil

class FileUploadService:
    @staticmethod
    def calculate_md5(file_data):
        """Calculate the MD5 hash of file data."""
        md5_hash = hashlib.md5()
        md5_hash.update(file_data)
        return md5_hash.hexdigest()

    @staticmethod
    def save_file_with_md5(file_data, output_dir):
        """Save the file data to the specified directory with the given filename."""
        md5_hash = FileUploadService.calculate_md5(file_data)
        filename_with_md5 = f"{md5_hash}"  # You can change the file extension if needed

        if not os.path.exists(output_dir):
            try:
                os.makedirs(output_dir)
                print(f"Directory '{output_dir}' created successfully.")
            except Exception as e:
                print(f"Error creating directory: {e}")

        output_path = os.path.join(output_dir, filename_with_md5)

        # Make sure the destination path does not already exist
        if os.path.exists(output_path):
            return md5_hash

        # Save the file data to the specified directory with the new name
        with open(output_path, "wb") as file:
            file.write(file_data)

        return md5_hash