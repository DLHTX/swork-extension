chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        if(request.message=='getLocalstorage'){
            sendResponse(localStorage.getItem('user'))
        }
        // let timeclock = setInterval(() => {
        //     alert(localStorage.getItem('user'))
        //     if (localStorage.getItem('user')) {
        //         sendResponse(localStorage.getItem('user'))
        //         clearInterval(timeclock)
        //     }
        // }, 1000)
    }
);