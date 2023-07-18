import pandas as pd

class CsvSource():
    """
    This class is responsible for loading the data from the csv file.
    """
    def __init__(self, file_path):
        self.file_path = file_path

    def load(self) -> pd.DataFrame:
        """
        Load the data from the csv file.
        return: pandas dataframe
        """
        return pd.read_csv(self.file_path)
