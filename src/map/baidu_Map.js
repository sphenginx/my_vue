export default {
    init: function() {
        let me = this;
        const AK = "tC4pGBT3ObEcpw0fp5BT8cvr9RmKRG0E";
        const apiVersion = "2.0";
        const BMap_URL = "//api.map.baidu.com/api?v="+ apiVersion +"&ak="+ AK +"&callback=onBMapCallback";
        return new Promise((resolve, reject) => {
            // 如果已加载直接返回
            if(typeof BMap !== "undefined") {
                resolve(BMap);
                return true;
            }
            // 百度地图异步加载回调处理
            window.onBMapCallback = function (BMap) {
                // console.log("百度地图脚本初始化成功...");
                resolve(BMap);
            };
            me.loadScript(BMap_URL);
        });
    }, 
    loadScript: function(src) {
        // 插入script脚本
        let scriptNode = document.createElement("script");
        scriptNode.setAttribute("type", "text/javascript");
        scriptNode.setAttribute("src", src);
        document.body.appendChild(scriptNode);
    }
}  