let asking_now = false;

$(document).ready(function () {
    $('.tabs').tabs();
    
    loadTemplate();
    loadAppData();
});

$(document).on({
    "contextmenu": function(e) {
        console.log("ctx menu button:", e.which);
        e.preventDefault();
    },
    "mousedown": function(e) { 
        console.log("normal mouse down:", e.which); 
    },
    "mouseup": function(e) { 
        console.log("normal mouse up:", e.which); 
    }
});

function loadTemplate() {
    
    // Language
    $("#mnu1 a").html(chrome.i18n.getMessage("lblMenu1"));
    $("#mnu2 a").html(chrome.i18n.getMessage("lblMenu2"));
    $("#mnu3 a").html(chrome.i18n.getMessage("lblMenu3"));
    
    $("#login input").attr("placeholder", chrome.i18n.getMessage("msgTxtMsg"));    
    $("#login label").html(chrome.i18n.getMessage("msgMasterID"));    
    //$("#connect").html(chrome.i18n.getMessage("btnSync"));    
    $("#nomaster").html(chrome.i18n.getMessage("msgNoMasterID"));
    $("#nosurf").html(chrome.i18n.getMessage("msgNoSurf"));    
    
    $("#btn_lbl_order").html(chrome.i18n.getMessage("btnOrder"));
    $("#btn_lbl_user").html(chrome.i18n.getMessage("btnUserAcc"));
    $("#btn_lbl_contact").html(chrome.i18n.getMessage("btnContact"));
    $("#btn_lbl_yt").html(chrome.i18n.getMessage("btnYT"));
    
    $("#btn_lbl_start").html(chrome.i18n.getMessage("btnStart"));
    $("#btn_lbl_stop").html(chrome.i18n.getMessage("btnStop"));

    // Links
    $("#btn_order").click(function () {
        openUrl(chrome.i18n.getMessage("amURLbuy"));
    });
    
    $("#btn_user").click(function () {
        openUrl(chrome.i18n.getMessage("amURLprofile"));
    });

    $("#btn_contact").click(function () {
        openUrl(chrome.i18n.getMessage("amURLcontact"));
    });
    
    $("#btn_yt").click(function () {
        openUrl(chrome.i18n.getMessage("amURLyt"));
    });    
    
    $("#connect").click(function () {
        connect(); 
    });
    
}

function defaultAppData() {
    this.masterID = 0;
    this.lastSite = null;
    this.surfing  = false;
}

function loadAppData() {
    chrome.storage.local.get("amAppData", function (result) {
        let amAppData = result.amAppData;
        if (!amAppData) {
            amAppData = new defaultAppData();
        }
        
        let mID = amAppData.masterID;
        let surfOn = amAppData.surfing;
        
        if(mID<1){
            $("#loader").addClass("hide");
            $("#login input").val("");
            $("#settings").removeClass("hide");
            $("#login input").focus();
            
        }else{
            $("#login input").val(mID);
            initButtons(mID);
            syncData(mID, surfOn); 
        }
        
        console.log("Data Loaded Successfully!");
    });
}

async function getAppData() {
    let amData = await getStorageData("amAppData");
    if (!amData) {
        amData = new defaultAppData();
    }

    return amData;
}

function openUrl(url) {
    
    chrome.tabs.create({url: url});
    window.close();

}

function getTabData(){
    chrome.tabs.query({active: true,currentWindow: true}, function(tabs) {
        var tabURL  = tabs[0].url;
        var tabID   = tabs[0].id;;
        alert(tabID);
    });  
}

function initButtons(mID) {

    $("#btn_start").click(function () {
        
        $("#btn_start").addClass("disabled");
        
        if(asking_now===false){
            asking_now = true;
            chrome.runtime.sendMessage( {asking: 'start_surf', master_id: mID}, async function(resp){
                let amData = await getAppData();
                amData.surfing = resp;
                chrome.storage.local.set({"amAppData": amData});
                $("#btn_stop").removeClass("disabled");
                asking_now = false;
            });   
        }

    });
    
    $("#btn_stop").click(function () {
        
        $("#btn_stop").addClass("disabled");
 
        if(asking_now===false){ 
            asking_now = true;
            chrome.runtime.sendMessage( {asking: 'stop_surf', master_id: mID}, async function(resp){ 
                let amData = await getAppData();
                amData.surfing = resp;
                chrome.storage.local.set({"amAppData": amData});
                $("#btn_start").removeClass("disabled");
                asking_now = false;
            });
        }
    });
    
    console.debug("Button loadded successful!");
}

function syncData(mID, surfOn){
    var xhr = new XMLHttpRequest();
    var url = 'https://www.alexamaster.net/api/v1/plugin_sync.php?master_id=' + mID + '&local_time=' + new Date().getTime();

    syncStart();
    
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 ) {
            if(xhr.status == 200){
                try {
                    var resp = JSON.parse(xhr.responseText);

                    if(resp["status"]==="success"){

                        focusSettings();
                        syncStatus(chrome.i18n.getMessage("msgConnected"), "green");

                        if(surfOn===true){
                            $("#btn_start").addClass("disabled");
                            $("#btn_stop").removeClass("disabled");
                            focusTabs("t3");
                        }else{
                            $("#btn_start").removeClass("disabled");
                            $("#btn_stop").addClass("disabled");
                            focusTabs("t1");
                        }

                        $(".collection-header h6").html(chrome.i18n.getMessage("msgGreet") + resp["master_name"]);
                        $(".collection-header h5").html(resp["master_points"] + " Points");                    
                    }else{
                        focusSettings();
                        syncStatus(resp["msg"], "red"); 
                    }

                }catch(err){
                    focusSettings();
                    syncStatus(chrome.i18n.getMessage("msgBadConnection"), "orange"); 
                }
            }else{
                focusSettings();
                syncStatus(chrome.i18n.getMessage("msgServerBusy"), "orange");    
            }
        }
    };
    xhr.onerror = function () { 
        focusSettings();
        syncStatus(chrome.i18n.getMessage("msgServerBusy"), "red"); 
    };
    xhr.send();    
}

function syncStart(){
    $("#connect").addClass("disabled");
    $("#loader").removeClass("hide");
    syncStatus(chrome.i18n.getMessage("msgConnecting"), "amber");   
}

function syncStatus(msg, col){
    $("#link_status").removeClass();
    $("#link_status").addClass(col+"-text center-align");
    $("#link_status").html(msg);   
}

function focusSettings(){
    $(".progress").hide();    
    $("#loader").addClass("hide");
    $("#settings").removeClass("hide");
    $("#login input").focus();
    $("#connect").removeClass("disabled");
}

function focusTabs(guitab){
    
    $("#user").removeClass("hide");
    $("#surf").removeClass("hide");    
    
    $("#mnu1").removeClass("disabled");
    $("#mnu3").removeClass("disabled");
    $('ul.tabs').tabs("select", guitab);
}

async function connect() {
    
    $("#mnu1").addClass("disabled");
    $("#mnu3").addClass("disabled");
    
    let masterID = $("#login input").val();

    if (masterID) {
        removeError();

        let amData = await getAppData();
        amData.masterID = masterID;
        chrome.storage.local.set({"amAppData": amData});

        syncData(masterID, amData.surfing);        
        
    } else {
        addError(chrome.i18n.getMessage("errNeedUser"));
    }
}

function addError(message) {
    $("#login span").html(message);
}

function removeError() {
    $("#login span").html("");
}

function getStorageData(key) {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.get(key, function (items) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError.message);
            } else {
                resolve(items[key]);
            }
        });
    });
}