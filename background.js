// make amazon requests in background to avoid mixed content errors

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request && request.message === "yang_request_amazon" && request.site && request.asin) {
            var amazon_url = "https://" + request.site + "/dp/" + request.asin + "/";
            console.log('yang_request_amazon', request.site, request.asin, amazon_url);

            var xhr = new XMLHttpRequest();
            xhr.open("GET", amazon_url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    var body = xhr.responseText || "";

                    var messageBack = {
                        "message": "yang_done_request_amazon",
                        "site": request.site,
                        "asin": request.asin,
                        "body": body
                    }

                    chrome.tabs.sendMessage(sender.tab.id, messageBack);
                }
            }
            xhr.send();
        }
    }
);