import re
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os

class MedicalDocumentExtractor:
    """
    Universal Extractor for Lab Reports.
    Handles Text-PDFs, Scanned PDFs, and Images (Photos of reports).
    """
    
    def __init__(self):
        # Configure tesseract path if needed (e.g., for Windows)
        # pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
        
        # Robust medical regex patterns
        self.patterns = {
            'hba1c': r'(?i)hba1c.*?([\d\.]+)\s*%',
            'bp': r'(?i)blood\s*pressure.*?(\d{2,3})\s*/\s*(\d{2,3})',
            'bmi': r'(?i)bmi.*?([\d\.]+)',
            'fasting_glucose': r'(?i)fasting\s*glucose.*?([\d\.]+)\s*mg/dl'
        }

    def _extract_from_pdf(self, file_path):
        """Extract text using PyMuPDF. Fast and clean for digital PDFs."""
        text = ""
        doc = fitz.open(file_path)
        for page in doc:
            page_text = page.get_text()
            if page_text.strip():
                text += page_text + "\n"
            else:
                # If page is an image (scanned PDF), use OCR
                pix = page.get_pixmap()
                img = Image.open(io.BytesIO(pix.tobytes()))
                text += pytesseract.image_to_string(img) + "\n"
        return text

    def _extract_from_image(self, file_path):
        """Extract text from an image photo using Tesseract OCR."""
        img = Image.open(file_path)
        return pytesseract.image_to_string(img)

    def extract_vitals(self, file_path):
        """Main method to read file and parse vitals."""
        print(f"Extracting data from: {file_path}")
        
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            raw_text = self._extract_from_pdf(file_path)
        elif ext in ['.jpg', '.jpeg', '.png']:
            raw_text = self._extract_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        print("--- Parsing Vitals ---")
        vitals = {}
        
        # Parse HbA1c
        hba1c_match = re.search(self.patterns['hba1c'], raw_text)
        if hba1c_match:
            vitals['hba1c'] = float(hba1c_match.group(1))
            
        # Parse BP (Systolic and Diastolic)
        bp_match = re.search(self.patterns['bp'], raw_text)
        if bp_match:
            vitals['bp_systolic'] = int(bp_match.group(1))
            vitals['bp_diastolic'] = int(bp_match.group(2))
            
        # Parse BMI
        bmi_match = re.search(self.patterns['bmi'], raw_text)
        if bmi_match:
            vitals['bmi'] = float(bmi_match.group(1))

        return vitals

if __name__ == "__main__":
    # Test the extractor
    extractor = MedicalDocumentExtractor()
    print("Extractor initialized.")
    print("To test, call extractor.extract_vitals('path_to_your_lab_report.pdf')")
