sub Init()
    ' Get references to UI elements
    m.top.titleLabel = m.top.FindNode("titleLabel")
    m.top.mediaPlayer = m.top.FindNode("mediaPlayer")
    m.top.statusLabel = m.top.FindNode("statusLabel")
    
    ' Set initial status
    m.top.statusLabel.text = "Fetching content from Innova Master Brain..."
    
    ' Make API request to fetch content
    FetchContent()
end sub

sub FetchContent()
    ' Create URL transfer object
    urlTransfer = CreateObject("roUrlTransfer")
    
    ' Set the API endpoint
    apiUrl = "https://innova-master-brain-api.onrender.com/api/content"
    urlTransfer.SetUrl(apiUrl)
    
    ' Set headers with tenant ID
    urlTransfer.AddHeader("Content-Type", "application/json")
    urlTransfer.AddHeader("x-tenant-id", "MVN")
    
    ' Make the GET request
    response = urlTransfer.GetToString()
    
    ' Parse the JSON response
    if response <> ""
        json = ParseJSON(response)
        
        if json <> invalid and json.videoUrl <> invalid
            ' Set the video URL to the media player
            m.top.mediaPlayer.content = {
                url: json.videoUrl
                streamformat: "hls"
                title: json.title
            }
            
            ' Update status
            m.top.statusLabel.text = "Playing: " + json.title
            
            ' Start playback
            m.top.mediaPlayer.control = "play"
        else
            m.top.statusLabel.text = "No video content available"
        end if
    else
        m.top.statusLabel.text = "Failed to fetch content. Check network connection."
    end if
    
    ' Clean up
    urlTransfer.AsyncCancel()
    urlTransfer = invalid
end sub