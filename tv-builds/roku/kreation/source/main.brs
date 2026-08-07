sub Main()
    ' Create the Roku screen
    screen = CreateObject("roSGScreen")
    
    ' Create the main scene
    scene = screen.CreateScene("MainScene")
    
    ' Show the screen
    screen.Show()
end sub