import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'app'))
from server import main
main()
