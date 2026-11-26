' File khoi dong chay an he thong SOS Da Nang (Khong hien cua so den)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Chay node server.js trong che do an (windowStyle = 0)
WshShell.CurrentDirectory = currentDir
WshShell.Run "cmd /c node server.js", 0, False

WScript.Sleep 1500
' Mo trinh duyet
WshShell.Run "http://localhost:5000"

