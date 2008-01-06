/**
 * @author giano
 */
$native(Date);
Date.extend({
	setISO8601:function (string) {
	    var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
	    var d = string.match(new RegExp(regexp));
	
	    var offset = 0;
	    var date = new Date(d[1], 0, 1);
	
	    if (d[3]) { date.setMonth(d[3] - 1); }
	    if (d[5]) { date.setDate(d[5]); }
	    if (d[7]) { date.setHours(d[7]); }
	    if (d[8]) { date.setMinutes(d[8]); }
	    if (d[10]) { date.setSeconds(d[10]); }
	    if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
	    if (d[14]) {
	        offset = (Number(d[16]) * 60) + Number(d[17]);
	        offset *= ((d[15] == '-') ? 1 : -1);
	    }
	
	    offset -= date.getTimezoneOffset();
	    time = (Number(date) + (offset * 60 * 1000));
	    this.setTime(Number(time));
		return this;
	},
	toISO8601String:function (format, offset) {
	    /* accepted values for the format [1-6]:
	     1 Year:
	       YYYY (eg 1997)
	     2 Year and month:
	       YYYY-MM (eg 1997-07)
	     3 Complete date:
	       YYYY-MM-DD (eg 1997-07-16)
	     4 Complete date plus hours and minutes:
	       YYYY-MM-DDThh:mmTZD (eg 1997-07-16T19:20+01:00)
	     5 Complete date plus hours, minutes and seconds:
	       YYYY-MM-DDThh:mm:ssTZD (eg 1997-07-16T19:20:30+01:00)
	     6 Complete date plus hours, minutes, seconds and a decimal
	       fraction of a second
	       YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45+01:00)
	    */
	    if (!format) { var format = 6; }
	    if (!offset) {
	        var offset = 'Z';
	        var date = this;
	    } else {
	        var d = offset.match(/([-+])([0-9]{2}):([0-9]{2})/);
	        var offsetnum = (Number(d[2]) * 60) + Number(d[3]);
	        offsetnum *= ((d[1] == '-') ? -1 : 1);
	        var date = new Date(Number(Number(this) + (offsetnum * 60000)));
	    }
	
	    var zeropad = function (num) { return ((num < 10) ? '0' : '') + num; }
	
	    var str = "";
	    str += date.getUTCFullYear();
	    if (format > 1) { str += "-" + zeropad(date.getUTCMonth() + 1); }
	    if (format > 2) { str += "-" + zeropad(date.getUTCDate()); }
	    if (format > 3) {
	        str += "T" + zeropad(date.getUTCHours()) +
	               ":" + zeropad(date.getUTCMinutes());
	    }
	    if (format > 5) {
	        var secs = Number(date.getUTCSeconds() + "." +
	                   ((date.getUTCMilliseconds() < 100) ? '0' : '') +
	                   zeropad(date.getUTCMilliseconds()));
	        str += ":" + zeropad(secs);
	    } else if (format > 4) { str += ":" + zeropad(date.getUTCSeconds()); }
	
	    if (format > 3) { str += offset; }
	    return str;
	}
});
var TimeLine=new Class({
	version: '1.11',
	canvas:null,
	boxes:null,
	ctx:null,
	engine:null,
	projects:[],
	minDate:null,
	maxDate:null,
	options: {
       containerId:null,
	   dataPath:"try.txt",
	   params:null,
	   style:{
	   		resourceHeight:24,
			projectTitleEight:24,
			dayWidth:24
	   },
	   autoSize:true	
    },
	/**
	 * @param {String} title The title of the timeline
	 * @param {Object} options The options of the timeline
	 */
	initialize:function(title,options){
		 this.setOptions(this.options,options);
		 var size=$(this.options.containerId).getCoordinates();
		 $(this.options.containerId).setStyles({
		 	'overflow':'hidden',
			'position':'relative',
			'top':'0px',
			'left':'0px'
		 });
		 $(this.options.containerId).addClass("timeline");
		 var sx={width:size.width,height:size.height};
		 this.canvas=new Canvas(this.options.containerId+"_canvas",sx).injectInside($(this.options.containerId))
		 this.canvas.setStyles({
			'position':'absolute',
			'top':'0px',
			'left':'0px',
			'z-index':'1',
			'overflow':'hidden',
			'width':sx.width+'px',
			'height':sx.height+'px',
			'background-color':'#FFFFFF'
		 });
		 this.ctx=this.canvas.getContext('2d');
		 this.boxes=new Element("div", {
		 	id: this.options.containerId + "_boxes"
		 }).injectInside($(this.options.containerId))
		 this.boxes.setStyles({
			'position':'absolute',
			'top':'0px',
			'left':'0px',
			'z-index':'2',
			'overflow':'hidden',
			'width':sx.width+'px',
			'height':sx.height+'px'
		 });
		 this.load(this.options.dataPath,this.options.params);
	},
	load:function(dataPath,params){
		dataPath=dataPath || this.options.dataPath;
		this.engine?this.engine.cancel:null;
		this.engine=new Json.Remote(dataPath,{method:"get",onComplete:this.loadComplete.bind(this)}).send(params);
	},
	loadComplete:function(response){
		if(response){
			this.initValues(response);
			this.draw();
		}else{
			
		}
	},
	initCanvas:function(){
		this.boxes.empty();
		var sx=this.boxes.getSize().scrollSize;
		var sxPos=$(this.options.containerId).getPosition();
		this.canvas.setProperty("width",sx.x);
		this.canvas.setProperty("height",sx.y);
		this.canvas.setStyles({
			'width':sx.x+'px',
			'height':sx.y+'px'
		});
		this.ctx.clearRect(0,0,sx.x,sx.y);
		this.ctx.lineCapp  = "butt";
	},
	drawMonths:function(){
		var sx=this.boxes.getSize().scrollSize;
		var one_day=1000*60*60*24;
		var months=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]
		var date=Math.floor((this.minDate.getTime()-(one_day*(128/this.options.style.dayWidth)))/one_day)*one_day;
		for(var k=0;k<sx.x;k+=this.options.style.dayWidth){
			this.ctx.beginPath();
			var dtn=new Date(date+one_day)
			if(dtn.getDate()==1){
				var mDiv=new Element("div",{
					"styles":{
						"position":"absolute",
						"top":"5px",
						"left":k+this.options.style.dayWidth+"px",
						"white-space":"nowrap"
					}
				}).setHTML(months[dtn.getMonth()]+" ("+(dtn.getMonth()+1)+")").injectInside(this.boxes);
				this.ctx.strokeStyle = "rgba(0, 0, 0,.2)";
			    this.ctx.lineWidth  = 1;
				this.ctx.moveTo(k,0);
				this.ctx.lineTo(k,sx.y);
				this.ctx.stroke();
			}
			date+=one_day;
		}
	},
	drawWeeks:function(){
		var sx=this.boxes.getSize().scrollSize;
		var one_day=1000*60*60*24;
		var date=Math.floor((this.minDate.getTime()-(one_day*(128/this.options.style.dayWidth)))/one_day)*one_day;
		for(var k=0;k<sx.x;k+=this.options.style.dayWidth){
			this.ctx.beginPath();
			var dt=new Date(date);
			var dtn=new Date(date+one_day)
			if(dt.getDay()==0){
				var mDiv=new Element("div",{
					"styles":{
						"position":"absolute",
						"top":"25px",
						"text-align":"center",
						"width":"12px",
						"left":k-12+"px"
					}
				}).setHTML(dt.getDate()).injectInside(this.boxes);
				var dtPos=mDiv.getCoordinates();
				this.ctx.fillStyle = 'rgba(0,0,0,.1)';
				var tx=this.canvas.roundedRectangle(dtPos.left-4,dtPos.top,dtPos.width+8,dtPos.height,5);
				this.ctx.fill();
				this.ctx.strokeStyle = "rgba(0, 0, 0,.1)";
			    this.ctx.lineWidth  = 1;
				this.ctx.moveTo(k,0);
				this.ctx.lineTo(k,sx.y);
				this.ctx.stroke();
			}
			date+=one_day;
		}
	},
	drawDays:function(){
		var sx=this.boxes.getSize().scrollSize;
		var one_day=1000*60*60*24;
		var date=Math.floor((this.minDate.getTime()-(one_day*(128/this.options.style.dayWidth)))/one_day)*one_day;
		for(var k=0;k<sx.x;k+=this.options.style.dayWidth){
			this.ctx.beginPath();
			var dt=new Date(date);
			this.ctx.strokeStyle = "rgba(0, 0, 0,.065)";
		    this.ctx.lineWidth  = 1;
			this.ctx.moveTo(k,0);
			this.ctx.lineTo(k,sx.y);
			this.ctx.stroke();
			date+=one_day;
		}
	},
	drawTime:function(){
		var sx=this.boxes.getSize().scrollSize;
		this.drawDays();
		this.drawWeeks();
		this.drawMonths()
		this.ctx.fillStyle = "rgba(255, 255, 255,.7)";
		this.ctx.fillRect(0,0,sx.x,40);
		this.ctx.strokeStyle = "rgba(0, 0, 0,.3)";
	    this.ctx.lineWidth  = 1;
		this.ctx.moveTo(0,40);
		this.ctx.lineTo(sx.x,40);
		this.ctx.stroke();
		var lingrad2 = this.ctx.createLinearGradient(0,40,0,45);
  		lingrad2.addColorStop(0, 'rgba(0,0,0,.2)');
  		lingrad2.addColorStop(1, 'rgba(0,0,0,0)');
		this.ctx.fillStyle = lingrad2;
		this.ctx.fillRect(0,40,sx.x,5);
	},
	drawConnection:function(from,to){
		if(from){
			var fromClass=from.hasClass("bad")?"bad":from.hasClass("good")?"good":"unknown";
			var fromPos=from.getCoordinates();
			var toPos=to.getCoordinates();
			var fromM=0;
			var toM=0;
			var mh=0;
			to.arrows=(to.arrows || 0)+1;
			if (!from.hasClass("projectBox")) {
				fromM = fromPos.top + (fromPos.height / 2);
				mh=toPos.height;
			}else {
				fromM = fromPos.top + (this.options.style.projectTitleEight / 2);
				mh=this.options.style.projectTitleEight;
			}
			var step=mh/(to.dependencies+1);
			toM = toPos.top + (to.arrows*step);
			var firstPosX=Math.round((toPos.left+(((toPos.left+fromPos.right))/2))/2);
			var firstPosY=Math.round(fromM);
			var secondPosX=Math.round((fromPos.right+(((toPos.left+fromPos.right))/2))/2);
			var secondPosY=Math.round(toM);
			this.ctx.beginPath();
			this.ctx.strokeStyle = "rgb(255, 255, 255)";
			this.ctx.fillStyle = this.ctx.strokeStyle;
		    this.ctx.lineWidth  = 3;
			this.ctx.moveTo(Math.round(fromPos.right),Math.round(fromM));
			this.ctx.bezierCurveTo(firstPosX, firstPosY, secondPosX, secondPosY, Math.round(toPos.left), Math.round(toM));
			this.ctx.stroke();
			this.drawArrow(toPos.left+4,Math.round(toM),7);
			this.ctx.beginPath();
			if(!from.hasClass("projectBox")){
				this.ctx.strokeStyle = fromClass=="bad"?"rgb(128, 0, 0)":fromClass=="good"?"rgb(0, 128, 0)":"rgb(0, 0, 0)";	
			}else{
				this.ctx.strokeStyle = fromClass=="bad"?"rgb(128, 64, 0)":fromClass=="good"?"rgb(0, 32, 128)":"rgb(0, 0, 0)";	
			}
			this.ctx.fillStyle=this.ctx.strokeStyle;
		    this.ctx.lineWidth  = 1;
			this.ctx.moveTo(Math.round(fromPos.right),Math.round(fromM));
			this.ctx.bezierCurveTo(firstPosX, firstPosY, secondPosX, secondPosY, Math.round(toPos.left), Math.round(toM));
			this.ctx.stroke();
			this.drawArrow(toPos.left+3,Math.round(toM),5);
		}
	},
	drawArrow:function(x,y,size){
		this.ctx.moveTo(x, y);
		this.ctx.beginPath();
		this.ctx.lineTo(x-size,y-size);
		this.ctx.lineTo(x-size,y+size);
		this.ctx.lineTo(x,y);
		this.ctx.fill();
	},
	get:function(projectId,taskId){
		var out=null;
		if($defined(taskId)){
			this.projects.each(function(project){
				if(project.project.id==projectId){
					project.resources.each(function(resource){
						resource.resource.tasks.each(function(task){
							if(task.id==taskId){
								out=task;
							}
						});
					});
				}
			});
		}else{
			this.projects.each(function(project){
				if(project.project.id==projectId){
					out=project.project;
				}
			});
		}
		return out;
	},
	initValues:function(values){
		var projectIndex=0;
		var projectPos=74;
		var today=new Date();
		values.projects.each(function(project){
			var dep=[];
			dep=values.projects.filter(function(item, index){
			 	return project.dependencies.contains(item.id);
			});
			project.dependencies=dep;
			var resourcesCount=project.resources.length;
			var resourcePos=0;
			project.from=(new Date()).setISO8601(project.from);
			project.to=(new Date()).setISO8601(project.to);
			project.due=(new Date()).setISO8601(project.due);
			this.minDate=new Date($defined(this.minDate)?Math.min(project.from.getTime(),this.minDate.getTime()):project.from.getTime())
			this.maxDate=new Date($defined(this.maxDate)?Math.max((project.to.getTime()>today.getTime()?project.due.getTime():project.to.getTime()),this.maxDate.getTime()):(project.to.getTime()>today.getTime()?project.due.getTime():project.to.getTime()))
			project.resources.each(function(resource){
				resource.tasks.each(function(task){
					task.from=(new Date()).setISO8601(task.from);
					task.to=(new Date()).setISO8601(task.to);
					task.due=(new Date()).setISO8601(task.due);
					var dep=[];
					task.dependencies.each(function(dependency){
						var dependencyRef=dependency.split("/");
						if(dependencyRef.length==1){
							var depF=values.projects.filter(function(item, index){
							 	return project.id==dependencyRef[0];
							}.bind(this));
							dep.push(depF.pop());
						}else{
							var depF=[];
							values.projects.each(function(project){
								if(project.id==dependencyRef[0]){
									project.resources.each(function(resource){
										resource.tasks.each(function(task){
											if(task.id==dependencyRef[1]){
												depF.push(task);	
											}
										}.bind(this));
									}.bind(this));
								}
							}.bind(this));
							dep.push(depF.pop());
						}
					}.bind(this));
					task.dependencies=dep;
				}.bind(this));
				resource.position=resourcePos*(this.options.style.resourceHeight+5);
				resource.index=resourcePos;
				resourcePos+=1;
			}.bind(this));
			project.position=projectPos;
			project.index=projectIndex;
			projectPos+=(project.resources.length*(this.options.style.resourceHeight+5))+this.options.style.projectTitleEight+15;
			projectIndex+=1
		}.bind(this));
		this.projects=[];
		if(this.options.autoSize){
			var one_day=1000*60*60*24;
			var gap=Math.ceil((this.maxDate.getTime()-this.minDate.getTime())/one_day);
			this.options.style.dayWidth=Math.max(3,Math.floor($(this.options.containerId).getCoordinates().width-188)/gap);
		}
		values.projects.each(function(project){
			this.projects.push(new TimeLine.Project(this,project));	
		}.bind(this));
	},
	draw:function(){
		this.initCanvas();
		this.drawTime();
		this.projects.each(function(project){
			project.draw();
		}.bind(this));
		this.projects.each(function(project){
			project.drawDependencies();
		}.bind(this));
	}
});
TimeLine.implement(new Options());

TimeLine.Project=new Class({
	timeline:null,
	resources:[],
	project:{},
	box:null,
	boxNames:null,
	tasks:null,
	initialize:function(timelineRef,project){
		this.timeline=timelineRef;
		this.project=project;
		this.project.parent=this;
		this.resources=[];
		project.resources.each(function(resource){
			this.resources.push(new TimeLine.Resource(this,resource));
		}.bind(this));
	},
	drawDependencies:function(){
		var box=this.project.box;
		this.project.dependencies.each(function(dependency){
			var dbox=dependency.box;
			this.timeline.drawConnection(dbox,box);
		}.bind(this));
		this.resources.each(function(resource){
			resource.drawDependencies();
		}.bind(this));
	},
	draw:function(){
		var one_day=1000*60*60*24;
		var adjust=0;
		var adjMinus=0;
		var today=new Date();
		var classN=(this.project.due.getTime()>today.getTime() && this.project.to.getTime()<today.getTime() )?"unknown":this.project.due.getTime()>=this.project.to.getTime()?"good":"bad"
		var minDatePos=Math.round(((this.project.from.getTime()-this.timeline.minDate.getTime())/one_day)*this.timeline.options.style.dayWidth);
		var maxDatePos=Math.round((((classN=="unknown"?this.project.due.getTime():this.project.to.getTime())-this.project.from.getTime())/one_day)*this.timeline.options.style.dayWidth);
		var dueDatePos=Math.round(((Math.min(this.project.to.getTime(),this.project.due.getTime())-this.project.from.getTime())/one_day)*this.timeline.options.style.dayWidth);
		this.box=new Element("div",{
			"id":"project_box_"+this.project.id,
			"class":"projectBox",
			"styles":{
				"position":"absolute",
				"left":minDatePos+128+"px",
				"top":this.project.position+"px",
				"width":(maxDatePos)+"px"
			}
		}).injectInside(this.timeline.boxes);
		this.box.dependencies=this.project.dependencies.length;
		this.box.addClass(classN);
		this.project.box=this.box;
		var boxTitle=new Element("div",{
			"class":"title",
			"id":"project_box_title_"+this.project.id,
			"styles":{
				"width":maxDatePos+"px",
				"height":this.timeline.options.style.projectTitleEight+"px",
				"overflow":"hidden",
				"position":"relative",
				"left":"0px",
				"top":"0px",
				"background-color":"transparent"
			},
			"title":this.project.title
		}).setHTML("<div class=\"projectTitle\">"+this.project.title+"</div>").injectInside(this.box);
		var boxResources=new Element("div",{
			"class":"resources",
			"id":"project_box_resources_"+this.project.id,
			"styles":{
				"width":"100%",
				"height":this.project.resources.length*(this.timeline.options.style.resourceHeight+5)+5+"px"
			}
		}).injectInside(this.box);
		this.boxNames=new Element("div",{
			"class":"boxNames",
			"id":"project_box_boxNames_"+this.project.id,
			"styles":{
				"width":"118px",
				"position":"absolute",
				"left":minDatePos+"px",
				"top":this.project.position+this.timeline.options.style.projectTitleEight+"px"
			}
		}).injectInside(this.timeline.boxes);
		this.tasks=new Element("div",{
			"class":"tasks",
			"id":"project_box_tasks_"+this.project.id,
			"styles":{
				"width":(maxDatePos)+"px",
				"height":"100%",
				"float":"left",
				"overflow":"hidden",
				"position":"relative",
				"top":"0px",
				"left":"0px"
			}
		}).injectInside(boxResources);
		var xin=minDatePos+128;
		var yin=this.project.position;
		this.timeline.ctx.beginPath();
		this.timeline.ctx.lineWidth  = 0;
		var lingrad2 = this.timeline.ctx.createLinearGradient(xin,yin,xin,yin+this.timeline.options.style.projectTitleEight);
		var bkCol="";
		switch (classN) {
			case "good":
				lingrad2.addColorStop(0, 'rgba(0,64,255,1)');
				lingrad2.addColorStop(1, 'rgba(0,32,128,1)');
				bkCol='rgba(0,64,255,.2)';
				break;
			case "bad":
				lingrad2.addColorStop(0, 'rgba(255,128,0,1)');
				lingrad2.addColorStop(1, 'rgba(128,64,0,1)');
				bkCol='rgba(255,128,0,.2)';
				break;
			default:
				lingrad2.addColorStop(0, 'rgba(255,255,255,1)');
				lingrad2.addColorStop(1, 'rgba(128,128,128,1)');
				bkCol='rgba(200,200,200,.2)';
		}
		var rectH=this.project.resources.length*(this.timeline.options.style.resourceHeight+5)+this.timeline.options.style.projectTitleEight;
		this.timeline.ctx.strokeStyle = "rgba(255,255,255,1)";
		this.timeline.ctx.lineWidth  = 1;
		var tx=this.timeline.canvas.roundedRectangle(xin-4.5-118,yin-4.5,maxDatePos+9+118,rectH+9,10);
		this.timeline.ctx.stroke();
		this.timeline.ctx.strokeStyle = "rgba(0,0,0,.3)";
		this.timeline.ctx.lineWidth  = .5;
		this.timeline.ctx.fillStyle = bkCol;
		var tx=this.timeline.canvas.roundedRectangle(xin-4-118,yin-4,maxDatePos+8+118,rectH+8,10);
		this.timeline.ctx.fill();
		this.timeline.ctx.stroke();
		this.timeline.ctx.strokeStyle = "rgba(255, 255,255,1)";
		this.timeline.ctx.lineWidth  = 1;
		var tx=this.timeline.canvas.roundedRectangle(xin-.5,yin-.5,maxDatePos+1,this.timeline.options.style.projectTitleEight+1,10);
		this.timeline.ctx.stroke();
		this.timeline.ctx.strokeStyle = "rgba(0, 0, 0,.4)";
		this.timeline.ctx.lineWidth  = 1;
		this.timeline.ctx.fillStyle = lingrad2;
		var tx=this.timeline.canvas.roundedRectangle(xin,yin,maxDatePos,this.timeline.options.style.projectTitleEight,10);
		this.timeline.ctx.fill();
		this.timeline.ctx.stroke();
		this.timeline.ctx.fillStyle ='rgba(255,255,255,.5)';
		var tx=this.timeline.canvas.roundedRectangle(xin+1,yin+1,dueDatePos-2,this.timeline.options.style.projectTitleEight-2,10);
		this.timeline.ctx.fill();
		this.resources.each(function(resource){
			resource.draw();
		}.bind(this));
	}
});
TimeLine.Resource=new Class({
	project:null,
	resource:{},
	taskBox:null,
	initialize:function(projectRef,resource){
		this.project=projectRef;
		this.resource=resource;
		this.resource.parent=this;
	},
	drawDependencies:function(){
		this.drawTasksDependencies();
	},
	draw:function(){
		var nameBox=new Element("div",{
			"class":"resourceName",
			"id":"project_box_resourceName_"+this.project.project.id+"_"+this.resource.id,
			"styles":{
				"width":"100%",
				"height":(this.project.timeline.options.style.resourceHeight+5)+"px",
				"float":"left",
				"padding-top":"2px",
				"clear":"both",
				"position":"relative",
				"top":"5px"
			},
			"title":this.resource.role
		}).setHTML("<div class=\"name\">"+this.resource.name+"</div>").injectInside(this.project.boxNames);
		this.taskBox=new Element("div",{
			"class":"taskBox",
			"id":"project_box_taskBox_"+this.project.project.id+"_"+this.resource.id,
			"styles":{
				"width":"100%",
				"height":(this.project.timeline.options.style.resourceHeight+5)+"px",
				"float":"left",
				"clear":"both",
				"position":"relative",
				"top":"4px"
			}
		}).injectInside(this.project.tasks);
		this.project.timeline.ctx.beginPath();
		this.project.timeline.ctx.strokeStyle = "rgba(0, 0, 0,.1)";
	    this.project.timeline.ctx.lineWidth  = 4;
		var projL=Math.round(this.project.box.getLeft());
		var projT=Math.round(this.project.box.getTop()+this.project.timeline.options.style.resourceHeight/2+this.project.timeline.options.style.projectTitleEight);
		this.project.timeline.ctx.moveTo(projL,projT+this.resource.position);
		var projW=projL+(this.project.box.getSize().size.x)-10;
		this.project.timeline.ctx.lineTo(projW,projT+this.resource.position);
		this.project.timeline.ctx.closePath();
		this.project.timeline.ctx.stroke();
		this.drawTasks();
	},
	drawTasksDependencies:function(){
		this.resource.tasks.each(function(task){
			var box=task.box;
			task.dependencies.each(function(dependency){
				var dbox=dependency.box;
				this.project.timeline.drawConnection(dbox,box);
			}.bind(this));
		}.bind(this));
	},
	drawTasks:function(){
		var one_day=1000*60*60*24;
		this.resource.tasks.each(function(task){
			var today=new Date();
			var classN=(task.due.getTime()>today.getTime() && task.to.getTime()<today.getTime())?"unknown":task.due.getTime()>=task.to.getTime()?"good":"bad";
			var minDatePos=Math.round(((task.from.getTime()-this.project.project.from.getTime())/one_day)*this.project.timeline.options.style.dayWidth);
			var maxDatePos=Math.round((((classN=="unknown"?task.due.getTime():task.to.getTime())-task.from.getTime())/one_day)*this.project.timeline.options.style.dayWidth);	
			var dueDatePos=Math.round(((Math.min(task.to.getTime(),task.due.getTime())-task.from.getTime())/one_day)*this.project.timeline.options.style.dayWidth);
			var taskBox=new Element("div",{
				"class":"task",
				"id":"project_box_taskBox_task_"+this.project.project.id+"_"+this.resource.id+"_"+task.id,
				"title":task.title,
				"styles":{
					"position":"absolute",
					"width":maxDatePos+"px",
					"top":"3px",
					"left":minDatePos+"px",
					"height":(this.project.timeline.options.style.resourceHeight-4)+"px",
					"overflow":"hidden",
					"background-color":"transparent"
				}
			}).setHTML("<div class=\"taskTitle\">"+task.title+"</div>").injectInside(this.taskBox);
			taskBox.addClass(classN);
			taskBox.dependencies=task.dependencies.length;
			this.project.timeline.ctx.beginPath();
			this.project.timeline.ctx.lineWidth  = 0;
			var projPos=this.project.box.getPosition();
			var xin=projPos.x+minDatePos-7;
			var yin=projPos.y+this.project.timeline.options.style.projectTitleEight+this.resource.position-1;
			var lingrad2 = this.project.timeline.ctx.createLinearGradient(xin,yin,xin,yin+this.project.timeline.options.style.resourceHeight);
			switch (classN) {
				case "good":
					lingrad2.addColorStop(0, 'rgba(0,255,0,1)');
					lingrad2.addColorStop(1, 'rgba(0,128,0,1)');
					break;
				case "bad":
					lingrad2.addColorStop(0, 'rgba(255,0,0,1)');
					lingrad2.addColorStop(1, 'rgba(128,0,0,1)');
					break;
				default:
					lingrad2.addColorStop(0, 'rgba(255,255,255,1)');
					lingrad2.addColorStop(1, 'rgba(128,128,128,1)');
			}
			this.project.timeline.ctx.strokeStyle = "rgba(255, 255,255,1)";
			this.project.timeline.ctx.lineWidth  = 1;
			var tx=this.project.timeline.canvas.roundedRectangle(xin-.5,yin-.5,maxDatePos+1,this.project.timeline.options.style.resourceHeight+1,10);
			this.project.timeline.ctx.stroke();
			this.project.timeline.ctx.strokeStyle = "rgba(0, 0, 0,.4)";
			this.project.timeline.ctx.lineWidth  = 1;
			this.project.timeline.ctx.fillStyle = lingrad2;
			var tx=this.project.timeline.canvas.roundedRectangle(xin,yin,maxDatePos,this.project.timeline.options.style.resourceHeight,10);
			this.project.timeline.ctx.fill();
			this.project.timeline.ctx.stroke();
			this.project.timeline.ctx.fillStyle ='rgba(255,255,255,.5)';
			var tx=this.project.timeline.canvas.roundedRectangle(xin+1,yin+1,dueDatePos-2,this.project.timeline.options.style.resourceHeight-2,10);
			this.project.timeline.ctx.fill();
			task.box=taskBox;
		}.bind(this));
	}
});