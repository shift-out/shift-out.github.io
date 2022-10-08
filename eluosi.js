var fenshu=0;
		var p=document.querySelector(".fens");
		//每次移动的距离
		var STEP=30;
		//分割为18行10列
		var ROW=18,COL=10;
		//创建每个模型的数据
		var MODELS=[
		{
			0:{row:2,col:0},
			1:{row:2,col:1},
			2:{row:2,col:2},
			3:{row:1,col:2}
		},
		{
			0:{row:1,col:1},
			1:{row:0,col:0},
			2:{row:1,col:0},
			3:{row:2,col:0}
		},
		{
			0:{row:1,col:1},
			1:{row:2,col:1},
			2:{row:1,col:2},
			3:{row:2,col:2}
		},
		{
			0:{row:0,col:0},
			1:{row:0,col:1},
			2:{row:0,col:2},
			3:{row:0,col:2}
		},
		{
			0:{row:1,col:1},
			1:{row:1,col:2},
			2:{row:2,col:2},
			3:{row:2,col:3}
		}
		]
		//当前使用的模型
		var currentModel={};//出错时把var去掉换成全局变量
		//标记16宫格的位置
		var currentX=0,currentY=0;
		//记录所有块元素的位置
		var fixedBlocks={};
		//当body加载完成后加载这个函数，主函数：入口
		function init(){
			onKeyDown();
			createModel();
			//document.onkeyup=keyboard;
		}
		//定时器
		var mInterval=null;
		//根据模型的数据源来创建对应的块元素
		function createModel(){
			if(isGameOver()){
				gameOver();
				return;
			}
			//确定使用当前哪一个模型

			currentModel=MODELS[Math.floor(Math.random()*5)];
			//重新初始化16宫格的位置
			currentX=0;
			currentY=0;
			//生成对应数量的块元素
			for(var  key in currentModel){
				var divEle=document.createElement("div");
				divEle.className="mode1";
				document.getElementById("container").appendChild(divEle);
			}
			locationBlocks();
			autoDown();
		}
		function locationBlocks(){
			checkBound();
			//拿到所有的块元素，
			var eles= document.getElementsByClassName("mode1");
			for(var i=0;i<eles.length;i++){
				//单个块元素
				var activityModelEle=eles[i];
				var blockMode1= currentModel[i];
				activityModelEle.style.top=(currentY+ blockMode1.row)*STEP+"px";
				activityModelEle.style.left=(currentX+ blockMode1.col)*STEP+"px";
			}
			//找到每个块元素对应的数据，根据每个块元素对应的数据来制定块元素的位置
		}
		//监听用户键盘事件
		//function keyboard(eve){
			 
			//switch(eve.keyCode){
				//case 38:console.log("旋转"); rotate(); break;
				//case 39:console.log("右"); move(1,0); break;
				//case 40:console.log("下"); move(0,1); break;
				//case 37:console.log("左"); move(-1,0); break;
			//}

		//}
		//键盘按下事件
		function onKeyDown(){
			document.onkeydown=function(event){
				switch(event.keyCode){
				case 38:console.log("旋转"); rotate(); break;
				case 39:console.log("右"); move(1,0); break;
				case 40:console.log("下"); move(0,1); break;
				case 37:console.log("左"); move(-1,0); break;
			}
			}
		}
		//按钮控制移动
		var dianj=document.querySelector(".anniuzu").querySelectorAll("button");
		for(var i=0;i<dianj.length;i++){
			dianj[i].onclick=function(){
			var ss=parseInt(this.getAttribute("sy"));
			switch(ss){
				case 0: rotate(); break;
				case 1: move(0,1); break;
				case 2: move(-1,0); break;
				case 3: move(1,0); break;
			}
		}
		}
		//键盘控制移动
		function move(x,y){   //控制移动
			//控制块元素进行移动
			//var yidong = document.getElementsByClassName("mode1")[0];
			//yidong.style.top=parseInt(yidong.style.top||0)+y*STEP+"px";
			//yidong.style.left=parseInt(yidong.style.left||0)+x*STEP+"px";
			if(isMeet(currentX+x,currentY+y,currentModel)){
				if(y!==0){
					fixedBottomModel();
				}
				return;
			}
			currentX+=x;
			currentY+=y;
		    //根据16宫格的位置来重新定位块元素
			locationBlocks();

		}
		//旋转模型
		function rotate(){
			//x=上一行的y,y=上一行的3-x

			//遍历我们的的模型数据源
			for( var key in currentModel){
				//块元素的数据源
				var blockMode1=currentModel[key];
				//实现我们的算法
				var temp=blockMode1.row;
				blockMode1.row=blockMode1.col;
				blockMode1.col=3 - temp;

			}
			locationBlocks();
		}
		//控制模型只能在容器中移动
		function checkBound(){
			//定义模型可以活动的边界
			var leftBound=0,
				rightBound=COL,
				bottomBound=ROW;
			//当模型中有一个块元素超出了边界之后，让16宫格回退
			for(var key in currentModel){
				var blockMode1 = currentModel[key];
				//左侧越界
				if((blockMode1.col+currentX)<leftBound){
					currentX++;
				}
				//右侧越界
				if((blockMode1.col+currentX)>=rightBound){
					currentX--;
				}
				//下面越界
				if((blockMode1.row+currentY)>=bottomBound){
					currentY--;
					fixedBottomModel();
				}
			}

		}
		//自己加的一个随机掉落
		function rotate2(){
			//x=上一行的y,y=上一行的3-x
			//遍历我们的的模型数据源
			console.log("aa");
			var blockMode1=currentModel[0];
			blockMode1.row=blockMode1.row+1;
			blockMode1.col=blockMode1.col+1;
			locationBlocks();
		}
			
		
		//把模型固定在底部
		function fixedBottomModel(){
			var activityModelEles=document.getElementsByClassName("mode1");
			//rotate2();
			for(var i=activityModelEles.length-1;i>=0;i--){
				//拿到每个块元素
				var activityModelEle=activityModelEles[i];
				activityModelEle.className="mode2";
				//把这个块元素放入记录变量中
				var blockMode1=currentModel[i];
				fixedBlocks[(currentY+blockMode1.row)+"_"+(currentX+blockMode1.col)]=activityModelEle;
			}
			isRemoveLine();
			//创建新的模型
			createModel();
			
		}
		//判断模型之间的触碰问题
		//xy表示将要移动到的位置，model表示当前模型将要完成得变化

		function isMeet(x,y,model){
			//当一个位置存在一个被固定的块元素时，活动中的块元素不可占用这个位置

			//判断触碰就是判断活动中的模型 要移动到的位置
			for(var k in model){
				var blockMode1=model[k];
				//该位置是否有块元素
				if(fixedBlocks[(y+blockMode1.row)+"_"+(x+blockMode1.col)]){
					return true;
				}
			}
			return false;
		}
		function isRemoveLine(){
			//在一行中，每一列都存在块元素，南无该行就需要被清理了
			//遍历所有行中的所有列
			for(var i=0;i<ROW;i++){
				var flag=true;
				for(var j=0;j<COL;j++){
					if(!fixedBlocks[i+"_"+j]){
						flag=false;
						break;
					}
				}
				if(flag){
					removeLine(i);
				}
			}
		}
		//清理被铺满的一行
		function removeLine(line){
			//删除该行中的所有块元素和数据源，
			for(var i=0;i<COL;i++){
				document.getElementById("container").removeChild(fixedBlocks[line+"_"+i]);
				fixedBlocks[line+"_"+i]=null;
			}
			downLine(line);
			fenshu+=10;
			p.innerHTML="您的分数为："+fenshu;
			if(fenshu=10){
				alert("恭喜你，口令红包为：''记得要先写￥再写后面的数字");
			}
		}
		//清理后元素下落
		function downLine(line){
			 for(var i=line-1;i>=0;i--){
			 	for(var j=0;j<COL;j++){
			 		if(!fixedBlocks[i+"_"+j]) continue;
			 		fixedBlocks[(i+1)+"_"+j]=fixedBlocks[i+"_"+j];
			 		fixedBlocks[(i+1)+"_"+j].style.top=(i+1)*STEP+"px";
			 		fixedBlocks[i+"_"+j]=null;
			 	}
			 }
		}
		function autoDown(){
			if(mInterval){
				clearInterval(mInterval);
			}
			mInterval= setInterval(function(){
				move(0,1)
			},600)
		}
		//判断游戏结束
		function isGameOver(){
			//当第0行存在块元素游戏结束
			for( var i=0;i<COL;i++){
				if(fixedBlocks["0_"+i]){
					return true;
				} 
			}
			return false;
		}
		//要结束掉游戏
		function gameOver(){
			if(mInterval){
				clearInterval(mInterval);
			}
			alert("你输了");
		}
		var shuax=document.querySelector(".shuax");
		shuax.addEventListener("click",function(){
			location.reload();
		})
