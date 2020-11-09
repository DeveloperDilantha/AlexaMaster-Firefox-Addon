let surfing = false;
let wait_time = 10000;
let brw_tab_id = null;
let tab_closed = true;
let watch_dog = null;
let end_url = null;
let camp_id = "new";


let isOpera = !!window.opera || -1 < navigator.userAgent.indexOf(" OPR/");
let isFirefox = -1 < navigator.userAgent.toLowerCase().indexOf("firefox");
let isChrome = !isOpera && !isFirefox;
let filter = { urls: [ "<all_urls>" ] };
let infoSpec = ['requestHeaders', 'blocking'];

isChrome && infoSpec.push("extraHeaders");


// Runtime Events
chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled....');
    
});

chrome.runtime.onStartup.addListener(() => {
    
    chrome.storage.local.get("amAppData", async function (result) {
        let amAppData = result.amAppData;
        if (amAppData) {

            let mID     = amAppData.masterID; 
            surfing     = amAppData.surfing; 
            
            startSurf(mID);
            
            console.log("Startup with Old Data");
        }else{
            console.log("Start without data");
        }
    });

});

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse){
    console.log(sender.tab ? "MSG By Content Script:" + sender.tab.url : "MSG By Extension");
    
    // Start Surfing
    if (request.asking == 'start_surf') {
        surfing = true;
        startSurf(request.master_id);
        sendResponse(surfing);
    }
    
    // Stop Surfing
    if (request.asking == 'stop_surf') {
        surfing = false;
        clearTimeout(watch_dog);
        closeTab();
        sendResponse(surfing);
    }
    
});

// Tabs Events
chrome.tabs.onRemoved.addListener(function(tabid,removed) {
    if(brw_tab_id == tabid){
        tab_closed = true;
        brw_tab_id = null;
        alert("You closed the surf tab. It will reopen shortly...")
    }
});

chrome.tabs.onUpdated.addListener(function(tabid, changeinfo, tab) {
    if(brw_tab_id == tabid){
        end_url = tab.url;
    }
});


// Surfing Functions
function openTab(){
    chrome.tabs.create({url: "about:blank", active: false }, tab =>{
        tab_closed = false;
        brw_tab_id = tab.id;
    });    
}

function closeTab(){
    if(tab_closed == false || brw_tab_id != null){
        chrome.tabs.remove(brw_tab_id);
        brw_tab_id = null;
        tab_closed = true;   
    }     
}

function startSurf(mID){

    if(surfing===true){
        
        openTab();
        
        var xhr = new XMLHttpRequest();
        var url = 'https://www.alexamaster.net/api/v1/plugin_surf_open.php?long_query=' + camp_id + '&master_id=' + mID + '&local_time=' + new Date().getTime();

        xhr.open("GET", url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 ) {
                if(xhr.status == 200){   
                    try {
                        var resp = JSON.parse(xhr.responseText);

                        if(resp["status"]==="success"){

                            // Make a log here 
                            camp_id = resp["token"];

                            //--------------------- Khong
                            let handler = function(d) {
                                var h = d.requestHeaders, b = {}, r = false;
                                for( var i = 0, l = h.length; i < l; ++i ) {
                                    if( h[i].name == 'User-Agent' && resp["ua"] != "-" ) {
                                        h[i].value = resp["ua"]; break;
                                    }
                                    if( h[i].name == 'Referer' && resp["ref"] != "-" ) {
                                        h[i].value = resp["ref"]; r = true; break;
                                    }
                                }
                                if(r == false && resp["ref"] != "-"){ 
                                    h.push({name:"Referer", value: resp["ref"]});  
                                }
                                b.requestHeaders = h; return b;
                            };
                            chrome.webRequest.onBeforeSendHeaders.addListener( handler, filter, infoSpec);
                            //--------------------- Khong

                            if(resp["up_url"] != "-"){ 
                                chrome.tabs.update(brw_tab_id, {url: resp["up_url"]});
                                watch_dog = setTimeout(function(){

                                    chrome.tabs.update(brw_tab_id, {url: resp["url"]});
                                    watch_dog = setTimeout(function(){ 
                                        stopSurf(mID, resp["down_url"], resp["down_time"]); 
                                    }, resp["time"]*1000);

                                }, resp["up_time"]*1000);    
                            }else{
                                chrome.tabs.update(brw_tab_id, {url: resp["url"]});
                                watch_dog = setTimeout(function(){ 
                                    stopSurf(mID, resp["down_url"], resp["down_time"]); 
                                }, resp["time"]*1000);    
                            }              


                        }else{
                            tryAgainSurf(mID);
                        }
                    }catch(err){console.log(err);
                        tryAgainSurf(mID); 
                    }  
                }else{
                    tryAgainSurf(mID);
                }   
            }
        };
        xhr.onerror = function () { 
            tryAgainSurf(mID); 
        };
        xhr.send();         
        
    }
}

function stopSurf(mID, downURL, downTime){

    clearTimeout(watch_dog);
    
    if(tab_closed===false && brw_tab_id != null){

        var xhr = new XMLHttpRequest();
        var url = 'https://www.alexamaster.net/api/v1/plugin_surf_close.php?long_query=' + camp_id + '&master_id=' + mID + '&local_time=' + new Date().getTime();

        xhr.open("POST", url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 ) {

                if(xhr.status == 200){

                    try {                
                        var resp = JSON.parse(xhr.responseText);

                        if(resp["status"]==="success"){


                            if(downURL != "-"){ 

                                chrome.tabs.update(brw_tab_id, {url: downURL});
                                watch_dog = setTimeout(function(){

                                    closeTab();                            
                                    startSurf(mID);

                                }, downTime*1000);

                            }else{

                                closeTab();
                                startSurf(mID);   
                            }                    


                        }else{
                            tryAgainSurf(mID);  
                        }
                    }catch(err){
                        tryAgainSurf(mID); 
                    }
                }else{
                    tryAgainSurf(mID);   
                }   
            }
        };
        xhr.onerror = function () { tryAgainSurf(mID);};
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.send( "end_url=" + encodeURI(end_url) );         
    }else{
        startSurf(mID);
    } 

}

function tryAgainSurf(mID){
    console.log("TRY AGAIN...");
    closeTab();
    setTimeout(function(){ 
        startSurf(mID); 
    }, wait_time);   
}

