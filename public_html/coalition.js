var xmlrpc;
var timer;
var page = "jobs";
var viewJob = 0;
var logId = 0;
var jobs = [];
var selectedJobs = {};
var cutJobs = {};
var selectedWorkers = {};
var selectedActivities = {};
var workers = [];
var parents = [];
var activities = [];
var affinities = [];
var jobsSortKey = "id";
var jobsSortKeyToUpper = true;
var workersSortKey = "name";
var workersSortKeyToUpper = true;
var activitiesSortKey = "start";
var activitiesSortKeyToUpper = false;
var selectionStart = 0;
var showTools = true;
var gridjobs;
var dataViewjobs;
var columnpicker;
var affinitieslist = [];

function setJobKey (id)
{
	// Same key ?
	if (jobsSortKey == id)
		jobsSortKeyToUpper = !jobsSortKeyToUpper;
	else
	{
		jobsSortKey = id;
		jobsSortKeyToUpper = true;
	}
	renderJobs ();
}

function setWorkerKey (id)
{
	// Same key ?
	if (workersSortKey == id)
		workersSortKeyToUpper = !workersSortKeyToUpper;
	else
	{
		workersSortKey = id;
		workersSortKeyToUpper = true;
	}
	renderWorkers ();
}

function setActivityKey (id)
{
	// Same key ?
	if (activitiesSortKey == id)
		activitiesSortKeyToUpper = !activitiesSortKeyToUpper;
	else
	{
		activitiesSortKey = id;
		activitiesSortKeyToUpper = true;
	}
	renderActivities ();
}

function get_cookie ( cookie_name )
{
  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );

  if ( results )
    return ( unescape ( results[2] ) );
  else
    return "";
}

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function isvalidparam(param) {
	if (param==null) return false;
	if (param=='') return false;
	return true;
}


$(document).ready(function()
{
	initJobs ();
	reloadJobs ();
	reloadWorkers ();
	reloadActivities ();
	renderAffinities ();
	showPage ("jobs");
	timer=setTimeout(timerCB,4000);
});

function showHideTools ()
{
    showTools = !showTools;
    updateTools ();
}

function updateTools ()
{
    if (!showTools)
    {
        $("#tools").show ();
        $("#jobtools").hide ();
        $("#workertools").hide ();
        $("#showhidetools").show ();
    }
    else if (page == "jobs")
    {
        $("#tools").show ();
        $("#jobtools").show ();
        $("#workertools").hide ();
    }
    else if (page == "workers")
    {
        $("#tools").show ();
        $("#jobtools").hide ();
        $("#workertools").show ();
    }
    else
    {
        $("#tools").hide ();
        $("#jobtools").hide ();
        $("#workertools").hide ();
    }
}

function goToJob (jobId)
{
    viewJob = jobId;
    paramname='parentid';

    var newvalue=jobId;
    var url =window.location.href;
    var newurl='';
    if(url.indexOf(paramname) >= 0) {
        newurl = updateQueryStringParameter(url,paramname,newvalue);
    }
    else {
        newurl = url + (url.split('?')[1] ? '&':'?') + paramname+'='+encodeURIComponent(newvalue);
    }
    if (newurl!='')  window.history.replaceState({} , "Title", newurl);

    reloadJobs ();
}

var tabs =
[
	[ "jobs", "#jobsTab", "jobtab" ],
	[ "workers", "#workersTab", "workertab" ],
	[ "activities", "#activitiesTab", "activitytab" ],
	[ "logs", "#logsTab", "logtab" ],
	[ "affinities", "#affinitiesTab", "affinitytab" ]
]

function showTab (tab)
{
	for (i = 0; i < tabs.length; ++i)
	{
		tabdef = tabs[i];
		if (tabdef[0] == tab)
		{
			$(tabdef[1]).show ();
			document.getElementById(tabdef[2]).className = "activetab";
		}
		else
		{
			$(tabdef[1]).hide ();
			document.getElementById(tabdef[2]).className = "unactivetab";
		}
	}
}

function showPage (thepage)
{
	page = thepage;
	showTab (page);
	updateTools ();
}

function clearLog ()
{
	$("#logs").empty ();
}

function renderLog (jobId)
{
    showPage ("logs");
	logId = jobId;
    $.ajax({ type: "GET", url: "/api/jobs/"+jobId+"/log", dataType: "json", success: 
        function (data) 
        {
	        $("#logs").empty();
	        $("#logs").append("<pre class='logs'><h2>Logs for job "+jobId+":</h2>"+data+"</pre>");

	        page = "logs";
	        updateTools ();
            document.getElementById("refreshbutton").className = "refreshbutton";
        }
    });
}

function getSelectedWorkers ()
{
    var data = [];
	for (j=workers.length-1; j >= 0; j--)
	{
		var name = workers[j].name;
		if (selectedWorkers[name])
		    data.push (name);
	}
	return data;
}

function clearWorkers ()
{
	if (confirm("Do you really want to delete the selected workers?"))
	{
        $.ajax({ type: "DELETE", url: "/api/workers", data: JSON.stringify(getSelectedWorkers ()), dataType: "json", success: 
            function () 
            {
    	        selectedWorkers = {}
	            reloadWorkers ();
    	        updateWorkerProps ();
            }
        });
	}
}
function formatDate (_date)
{
	var date = new Date(_date*1000)
    return date.getFullYear() + '/' + ('0' +(date.getMonth()+1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours ()).slice(-2) + ':' + ('0' + date.getMinutes ()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
}

function formatDuration (secondes)
{
	var days = Math.floor (secondes / (60*60*24));
	var hours = Math.floor ((secondes-days*60*60*24) / (60*60));
	var minutes = Math.floor ((secondes-days*60*60*24-hours*60*60) / 60);
	var secondes = Math.floor (secondes-days*60*60*24-hours*60*60-minutes*60);
	if (days > 0)	
		return days + " d " + hours + " h " + minutes + " m " + secondes + " s";
	if (hours > 0)	
		return hours + " h " + minutes + " m " + secondes + " s";
	if (minutes > 0)	
		return minutes + " m " + secondes + " s";
	return secondes + " s";
}

// Timer callback
function timerCB ()
{
    if (document.getElementById("autorefresh").checked)
	    refresh ();

	// Fire a new time event
	timer=setTimeout(timerCB,4000);
}

function refresh ()
{
    document.getElementById("refreshbutton").className = "refreshing";
	if (page == "jobs")
		reloadJobs ();
	else if (page == "workers") 
		reloadWorkers ();
	else if (page == "activities") 
		reloadActivities ();
	else if (page == "logs") 
		renderLog (logId);
	else if (page == "affinities") 
		renderAffinities ();
}

function compareStrings (a,b,toupper)
{
	if (a < b)
		return toupper ? -1 : 1;
	if (a == b)
		return 0;
	return toupper ? 1 : -1;
}

function compareNumbers (a,b,toupper)
{
	return toupper ? a-b : b-a;
}

// Returns the HTML code for a job title column
function addSumEmpty (str)
{
	if (str == undefined)
		return "<td></td>";
	else
		return "<td class='headerCell'>" + str + "</td>";
}

// Returns the HTML code for a job title column
function addSum (inputs, attribute)
{
	var sum = 0;
	for (i=0; i < inputs.length; i++)
	{
		var job = inputs[i];
		sum += job[attribute];
	}
	return "<td class='headerCell'>" + sum + "</td>";
}

// Returns the HTML code for a job title column
function addSumFinished (inputs, attribute)
{
	var sum = 0;
	for (i=0; i < inputs.length; i++)
	{
		var job = inputs[i];
		if (job[attribute] == "FINISHED")
		    sum ++;
	}
	return "<td class='headerCell'>" + sum + " FINISHED</td>";
}

// Average
function addSumAvgDuration (inputs, attribute)
{
	var sum = 0;
	var count = 0;
	for (i=0; i < inputs.length; i++)
	{
		var job = inputs[i];
		sum += job[attribute];
		count++;
	}
	if (count > 0)
	    return "<td class='headerCell'>Avg " + formatDuration (sum/count) + "</td>";
    else
        return "<td class='headerCell'></td>";
}

// Returns the HTML code for a job title column
function addSumSimple (inputs)
{
	return "<td class='headerCell'>" + inputs.length + " jobs</td>";
}

function renderParents ()
{
	$("#parents").empty ();
	for (i=0; i < parents.length; i++)
	{
		var parent = parents[i];
    	$("#parents").append((i == 0 ? "" : " > ") + ("<a href='javascript:goToJob("+parent.id+")'>" + parent.title + "</a>"));
	}
}

function formatterduration(row, cell, secondes, columnDef, dataContext) 
{
    if (isNaN(secondes)) { return ""; }
    return formatDuration(secondes);
}
function formatterdate(row, cell, timestamp, columnDef, dataContext) 
{
    return formatDate(timestamp);
}

function formatterstate (row, cell, value, columnDef, dataContext){

	if (row == null)         
		var contents = value + ' FINISHED'; 
        else 
		var contents = '<div class="' + value +'">'+ (value ? value : '\n') + "</div>"; 
        return contents
};

function formattertitle (row, cell, value, columnDef, dataContext){

	if (row == null)         
		var contents = value + ' Jobs'; 
        else 
		var contents = value; 
        return contents
};

function ProgressCompleteBarFormatter(row, cell, value, columnDef, dataContext) {
    if (value == null || value === "") {
      return "";
    }
    _value= Math.floor(value*100.0)
    return "<div style='position: relative;'><div class='progress-complete-bar lprogressbar' style='width:" + _value + "%'></div><div><span style='position: absolute;width: 100%;text-align: center;margin:auto;'>"+_value+"%</span></div></div>";
}

    function split( val ) {
      return val.split( /,\s*/ );
    }
    function extractLast( term ) {
      return split( term ).pop();
    }

function initJobs() {

   $( "#filterJobsAffinity" )
      // don't navigate away from the field on tab when selecting an item
      .on( "keydown", function( event ) {
        if ( event.keyCode === $.ui.keyCode.TAB &&
            $( this ).autocomplete( "instance" ).menu.active ) {
          event.preventDefault();
        }
      })
      .autocomplete({
        minLength: 0,
        source: function( request, response ) {
          // delegate back to autocomplete, but extract the last term
          response( $.ui.autocomplete.filter(
            affinitieslist, request.term ) );
        },
        focus: function() {
          // prevent value inserted on focus
          return false;
        },
/*
        select: function( event, ui ) {
          var terms = split( this.value );
          // remove the current input
          terms.pop();
          // add the selected item
          terms.push( ui.item.value );
          // add placeholder to get the comma-and-space at the end
          terms.push( "" );
          this.value = terms.join( ", " );
          return false;
        }
*/
      });

  
  var columns = [
    {id: "id", name: "ID", field: "id",width: 60,maxWidth: 70,sortable: true},
    {id: "title", name: "Title", field: "title",minWidth:370,sortable: true,formatter:formattertitle ,totalized: true, totalizationType:Slick.Controls.ColumnPicker.Countrows,totalizationvalue: 'ALL'},
    {id: "url", name: "URL", field: "url"},
    {id: "user", name: "user", field: "user",sortable: true},
    {id: "state", name: "State", field: "state",minWidth:60,sortable: true,formatter: formatterstate,totalized: true, totalizationType:Slick.Controls.ColumnPicker.Countrows,totalizationvalue: 'FINISHED',groupable:true},
    {id: "priority", name: "priority", field: "priority",sortable: true,cssClass: 'slick-right-align',width: 50},
    {id: "ok", name: "ok", field: "total_finished",sortable: true,width: 40,cssClass: 'slick-right-align',totalized: true, totalizationType: Slick.Data.Aggregators.Sum},
    {id: "wrk", name: "wrk", field: "total_working",sortable: true,width: 40,cssClass: 'slick-right-align',totalized: true, totalizationType: Slick.Data.Aggregators.Sum},
    {id: "err", name: "err", field: "total_errors",sortable: true,width: 40,cssClass: 'slick-right-align',totalized: true, totalizationType: Slick.Data.Aggregators.Sum},
    {id: "total", name: "total", field: "total",sortable: true,width: 50,cssClass: 'slick-right-align',totalized: true, totalizationType: Slick.Data.Aggregators.Sum},
    {id: "progress", name: "Progress", field: "progress",sortable: true,width: 50,formatter:ProgressCompleteBarFormatter},
    {id: "affinity", name: "affinity", field: "affinity",sortable: true,minWidth:110,cssClass: 'slick-right-align',groupable:true},
    {id: "timeout", name: "timeout", field: "timeout",width: 40,cssClass: 'slick-right-align'},
    {id: "worker", name: "worker", field: "worker",sortable: true,groupable:true},
    {id: "start_time", name: "start_time", field: "start_time",sortable: true,width: 130,cssClass: 'slick-right-align',formatter: formatterdate},
    {id: "duration", name: "Duration", field: "duration",cssClass: 'slick-right-align',sortable: true,formatter: formatterduration,totalized: true, totalizationType: Slick.Data.Aggregators.Avg},
    {id: "avgduration", name: "AVG Duration", field: "avgduration",cssClass: 'slick-right-align',sortable: true,formatter: formatterduration,totalized: true, totalizationType: Slick.Data.Aggregators.Avg},
    {id: "run", name: "run", field: "run"},
    {id: "command", name: "command", field: "command"},
    {id: "dir", name: "dir", field: "dir"},
    {id: "dependencies", name: "dependencies", field: "dependencies"},
  ];
  var options = {
    headerRowHeight: 10,
    enableCellNavigation: true,
    showFooterRow: true,
    forceFitColumns: false,
    explicitInitialization: true,
  };


  var groupItemMetadataProvider = new Slick.Data.GroupItemMetadataProvider();
  dataViewjobs = new Slick.Data.DataView({groupItemMetadataProvider: groupItemMetadataProvider});

  gridjobs = new Slick.Grid("#jobs",dataViewjobs, columns, options);
  gridjobs.registerPlugin(groupItemMetadataProvider);
  gridjobs.setSelectionModel(new Slick.RowSelectionModel());
  columnpicker = new Slick.Controls.ColumnPicker(columns, gridjobs, options);

  //dataViewjobs.setItems(jobs);
  gridjobs.init();


  dataViewjobs.onRowCountChanged.subscribe(function (e, args) {
    gridjobs.updateRowCount();
  gridjobs.render();
  });

  dataViewjobs.onRowsChanged.subscribe(function (e, args) {
    gridjobs.invalidateRows(args.rows);
    gridjobs.render();
  });

  gridjobs.onSort.subscribe(function(e, args) {
    var comparer = function(a, b) {
      return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
    }

    // Delegate the sorting to DataView.
    // This will fire the change events and update the grid.
    dataViewjobs.sort(comparer, args.sortAsc);
  });

  gridjobs.onClick.subscribe(function(e, args) {
    document.getElementById("selectJobs").value = "CUSTOM";
    var item = dataViewjobs.getItem(args.row);
  });

  gridjobs.onSelectedRowsChanged.subscribe (function (e, args) 
  {
    var Ljobid;
    selectedJobs={};
    for (i=0; i < gridjobs.getSelectedRows().length; i++)  {
	Ljobid = dataViewjobs.getItem(gridjobs.getSelectedRows()[i]).id;
	selectedJobs[Ljobid]=true;
    }
    updateJobProps ();
  });

  gridjobs.onDblClick.subscribe(function(e, args) {
    var item = dataViewjobs.getItem(args.row);
    item.command != "" ? renderLog (item.id) : goToJob (item.id);
  });
}

function renderJobs ()
{

        dataViewjobs.setItems(jobs);
	dataViewjobs.reSort();
        gridjobs.invalidate();
//  gridjobs.render();

      items=gridjobs.getData().getItems();
      $.each(gridjobs.getColumns(), function () {
        if (this.totalized) {
          columnpicker.updateTotalizedColumns(items,this);
	}

      });


      var test = document.getElementById("selectJobs");
      if (test != undefined) 
	 test.value = "NONE";
      gridjobs.setSelectedRows([]);	

}

function groupByaffinity(dataView) {
  dataView.setGrouping({
    getter: "affinity",
    formatter: function (g) {
      return "affinity:  " + g.value + "  <span style='color:green'>(" + g.count + " items)</span>";
    },
    aggregators: [
    ],
    aggregateCollapsed: false,
    lazyTotalsCalculation: true
  });
}


function logSelection ()
{
	for (j=jobs.length-1; j >= 0; j--)
	{
		var job = jobs[j];
		if (selectedJobs[job.id])
			renderLog (job.id);
	}
}

function sendreloadJobs (emitter_id) {
//    var globalhref=location.protocol + "//" + location.host + location.pathname;

    var newvalue=document.getElementById(emitter_id).value;
    var url =window.location.href;
    var newurl='';
    if(url.indexOf(emitter_id) >= 0) {
        newurl = updateQueryStringParameter(url,emitter_id,newvalue);
    }
    else {
        newurl = url + (url.split('?')[1] ? '&':'?') + emitter_id+'='+encodeURIComponent(newvalue);
    }
    if (newurl!='')  window.history.replaceState({} , "Title", newurl);
    reloadJobs ()
}
// Ask the server for the jobs and render them
function reloadJobs ()
{
    parents = [];
    var tag_param = getParameterByName("filterJobs");
    var affinity_param = getParameterByName("filterJobsAffinity");
    var title_param = getParameterByName("filterJobsTitle");
    var tag = document.getElementById("filterJobs").value;
    var affinity = document.getElementById("filterJobsAffinity").value;
    var title = document.getElementById("filterJobsTitle").value;

    tag_param = tag_param == "NONE" ? "" : tag_param;
    tag = tag == "NONE" ? "" : tag;

    var parentid_param = getParameterByName("parentid");
    if (isvalidparam(parentid_param)) {
	viewJob=parentid_param;
    }

    if (tag=='' ) {
	if (isvalidparam(tag_param)) {
		tag=tag_param;
		$("#filterJobs").val(tag);
	}
    }
    if (affinity=='' ) {
	if (isvalidparam(affinity_param)) {
		affinity=affinity_param;
		$("#filterJobsAffinity").val(affinity);
	}
    }
    if (title=='' ) {
	if (isvalidparam(title_param)) {
		title=title_param;
		$("#filterJobsTitle").val(title);
	}
    }

    var data = {filter:tag}
    $.ajax({ type: "GET", url: "/api/jobs/"+viewJob+"/children", data: JSON.stringify(data), dataType: "json", success: 
        function(data) 
        {
        	if (tag != "" || title != "" || affinity != "")
        	{
        		var newdata = [];
        		for (i = 0; i < data.length; ++i)
        		{
        			var	filtered = true;
        			if (tag != "" && data[i].state != tag)
        				filtered = false;
        			if (title != "" && data[i].title.search (title) < 0)
        				filtered = false;
        			if (affinity != "" && data[i].affinity.search (affinity) < 0)
        				filtered = false;
        			if (filtered)
        				newdata.push (data[i]);
        		}
        		data = newdata;

        	}
			jobs = data;

			var	idtojob = {}
			for (i = 0; i < jobs.length; ++i)
			{
				var job = jobs[i]
				idtojob[job.id] = job
				job.dependencies = []
				if (job.total_finished > 0)
					job.avgduration = Math.round(job.duration/job.total_finished); 
				else job.avgduration=job.duration;
			}

			$.ajax({ type: "GET", url: "/api/jobs/"+viewJob+"/childrendependencies", dataType: "json", success: 
				function(data) 
				{
					for (var i = 0; i < data.length; ++i)
					{
						var	job = idtojob[data[i].id];
						if (job)
							job.dependencies.push (data[i].dependency);
					}

					for (var i = 0; i < jobs.length; ++i)
					{
						var	job = jobs[i];
						job.dependencies = job.dependencies.join (",");
					}
			        renderJobs ();

//					for (i = 0; i < jobs.length; ++i)
//						$("#job"+jobs[i].id+"Deps").text (jobs[i].dependencies)
		            document.getElementById("refreshbutton").className = "refreshbutton";
				}
			});
        }
    });

    function getParent (id)
    {
    	if (id == 0)
    	{
    		parents.unshift ({id:0,title:"Root"});
        	renderParents ();
    	}
    	else
    	{
		    $.ajax({ type: "GET", url: "/api/jobs/"+id, data: JSON.stringify(data), dataType: "json", success: 
		        function(data) 
		        {
			        parents.unshift (data);
			        getParent (data.parent);
		        }
		    });
    	}
    }
    getParent (viewJob)
}

function startWorkers ()
{
    $.ajax({ type: "POST", url: "/api/startworkers", data: JSON.stringify(getSelectedWorkers ()), dataType: "json", success: 
        function () 
        {
        	reloadWorkers ();
        }
    });
}

function stopWorkers ()
{
    $.ajax({ type: "POST", url: "/api/stopworkers", data: JSON.stringify(getSelectedWorkers ()), dataType: "json", success: 
        function () 
        {
        	reloadWorkers ();
        }
    });
}

function workerActivity ()
{
	for (j=workers.length-1; j >= 0; j--)
	{
		var worker = workers[j];
		if (selectedWorkers[worker.name])
		{
		    title:$('#activityWorker').attr("value", worker.name)
		    title:$('#activityJob').attr("value", "")
           	break;
        }
	}

    reloadActivities ()
	page = "activities"
	showPage ("activities")
}

function terminateWorkers ()
{
	if (confirm("Do you really want to terminate the selected worker instances?"))
	{
		$.ajax({ type: "POST", url: "/api/terminateworkers", data: JSON.stringify(getSelectedWorkers ()), dataType: "json", success: 
			function () 
			{
				reloadWorkers ();
			}
		});
	}
}function jobActivity ()
{
	for (j=jobs.length-1; j >= 0; j--)
	{
		var job = jobs[j];
		if (selectedJobs[job.id])
		{
		    title:$('#activityWorker').attr("value", "")
		    title:$('#activityJob').attr("value", job.id)
           	break;
        }
	}

    reloadActivities ()
	page = "activities"
	showPage ("activities")
}

var MultipleSelection = {}
function checkSelectionProperties (list, props, selectedList, idName)
{
    var values = []

	for (i = 0; i < list.length; i++)
	{
		var item = list[i];
		if (selectedList[item[idName]])
		{
    		for (j = 0; j < props.length; ++j)
    		{
    		    var value = item[props[j][0]];
    		    if (values[j] != null && values[j] != value)
    		        values[j] = MultipleSelection;
    		    else
    		        values[j] = value;
    		}
		}
	}

    for (i = 0; i < props.length; ++i)
    {
        if (values[i] == MultipleSelection)
        {
            // different values
            $('#'+props[i][1]).css("background-color", "orange");
            $('#'+props[i][1]).attr("value", "");
        }
        else if (values[i] == null)
        {
            // default value
            $('#'+props[i][1]).css("background-color", "white");
            $('#'+props[i][1]).attr("value", props[i][2]);
        }
        else
        {
            // unique values
            $('#'+props[i][1]).css("background-color", "white");
            $('#'+props[i][1]).attr("value", values[i]);
        }
    }
    return values;
}

function updateSelectionProp (values, props, prop)
{
    for (i = 0; i < props.length; ++i)
        if (props[i][1] == prop)
        {
            values[i] = true;
            $('#'+props[i][1]).css("background-color", "greenyellow");
            break;
        }
}

function sendSelectionPropChanges (list, idName, values, props, objects, selectedList, func)
{
	if (!props.length)
		return;

	var data = {};
	var idsN = 0;
	for (j=list.length-1; j >= 0; j--)
	{
		var id = list[j][idName];
		if (selectedList[id])
		{
			var _props = {}
		    for (i = 0; i < props.length; ++i)
		        if (values[i] == true)
		        {
		            var prop = props[i][0];
		            var value = $('#'+props[i][1]).attr("value");
		            if (prop == "dependencies")
		            	value = value.split(",");
		            _props[prop] = value;
		        }
	     	data[id] = _props;
	     	idsN++;
		}
    }

    if (!idsN)
    	return;

    // One single call
    $.ajax({ type: "POST", url: "/api/"+objects.toLowerCase(), data: JSON.stringify(data), dataType: "json", success:
        function ()
        {
            for (i = 0; i < props.length; ++i)
                if (values[i] == true)
                {
                    props[i][2] = value;
                }
            func ();
        }
    });
}

function setSelectionDefaultProperties (props)
{
    for (i = 0; i < props.length; ++i)
        props[i][2] = $('#'+props[i][1]).attr("value");
}

var WorkerProps =
[
    [ "affinity", "waffinity", "" ],
];
var updatedWorkerProps = {}

function updateWorkerProps ()
{
    updatedWorkerProps = checkSelectionProperties (workers, WorkerProps, selectedWorkers, "name");
}

function onchangeworkerprop (prop)
{
    updateSelectionProp (updatedWorkerProps, WorkerProps, prop);
}

function updateworkers ()
{
    sendSelectionPropChanges (workers, 'name', updatedWorkerProps, WorkerProps, "Workers", selectedWorkers,
        function ()
        {
            reloadWorkers ();
        }
    );
}

function reloadWorkers ()
{
    $.ajax({ type: "GET", url: "/api/workers", dataType: "json", success: 
        function (data) 
        {
	        workers = data;
	        renderWorkers ();
            document.getElementById("refreshbutton").className = "refreshbutton";
        }
    });
}

function renderWorkers ()
{
	$("#workers").empty ();

	var table = "<table id='workersTable'>";
	table += "<tr class='title'>\n";

	// Returns the HTML code for a worker title column
	function addTitleHTML (attribute)
	{
        table += "<th class='headerCell' onclick='"+"setWorkerKey(\""+attribute+"\")'>";	
		var value = workers[0];
		if (value && value[attribute] != null)
		{
			table += attribute;
			if (attribute == workersSortKey && workersSortKeyToUpper)
				table += " &#8595;";
			if (attribute == workersSortKey && !workersSortKeyToUpper)
				table += " &#8593;";
		}
		else
			table += attribute;
		table += "</th>";
	}

    addTitleHTML ("name");
    addTitleHTML ("active");
    addTitleHTML ("state");
    addTitleHTML ("affinity");
    addTitleHTML ("ping_time");
    addTitleHTML ("cpu");
    addTitleHTML ("memory");
    addTitleHTML ("last_job");
    addTitleHTML ("finished");
    addTitleHTML ("error");
    addTitleHTML ("ip");

	table += "</tr>\n";

	function _sort (a,b)
	{
		var aValue = a[workersSortKey];
		if (typeof aValue == 'string')
			return compareStrings (aValue, b[workersSortKey], workersSortKeyToUpper);
		else
			return compareNumbers (aValue, b[workersSortKey], workersSortKeyToUpper);
	}

	workers.sort (_sort);

	for (i=0; i < workers.length; i++)
	{
		var worker = workers[i];

        // *** Build the load tab for this worker		
        // A global div
	    var load = "<div class='load'>";
	        // Add each cpu load
        var loadValue = 0;
        try
        {
			var workerload = JSON.parse (worker.cpu)
			for (j=0; j < workerload.length; ++j)
			{
				load += "<div class='loadbar' style='width:" + workerload[j] + "%;height:" + 16/workerload.length + "' />";
				loadValue += workerload[j];
			}
			Math.floor(loadValue/workerload.length);
        }
        catch (err)
        {
        	loadValue = 0;
        }
        // Add the numerical value of the load
		load += "<div class='loadlabel'>" + loadValue + "%</div>";
	    load += "</div>";
    
        // *** Build the memory tab for this worker		
	    var memory = "<div class='mem'>";
   	    memory += "<div class='membar' style='width:" + 100*(worker.total_memory-worker.free_memory)/worker.total_memory + "%' />";

        function formatMem (a)
        {
            if (a > 1024)
                return Math.round(a/1024*100)/100 + " GB";
            else
                return str(a) + " Mo";
        }
        
        memLabel = formatMem (worker.total_memory-worker.free_memory);
        memLabel += " / ";
        memLabel += formatMem (worker.total_memory);

        // Add the numerical value of the mem
        memory += "<div class='memlabel'>" + memLabel + "</div>";
	    memory += "</div>";

		table += "<tr id='workertable"+i+"' class='entry"+(i%2)+(selectedWorkers[worker.name]?"Selected":"")+"'>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+worker.name+"</td>"+
		         "<td class='active"+worker.active+"' onMouseDown='onClickList(event,"+i+")'>"+worker.active+"</td>"+
		         "<td class='"+worker.state+"' onMouseDown='onClickList(event,"+i+")'>"+worker.state+"</td>"+
		         "<td class='worker_affinities' onMouseDown='onClickList(event,"+i+")'>"+worker.affinity+"</td>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+formatDate (worker.ping_time)+"</td>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+load+"</td>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+memory+"</td>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+worker.last_job+"</td>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+worker.finished+"</td>"+
		         "<td onMouseDown='onClickList(event,"+i+")'>"+worker.error+"</td>"+
		         "<td>"+worker.ip+"</td>"+
		         "</tr>\n";
	}
	table += "</table>";
	$("#workers").append(table);
	$("#workers").append("<br>");
}

function reloadActivities ()
{
    var data = {}
    var job = $('#activityJob').attr("value")
    if (job != "")
        data.job = job
    var worker = $('#activityWorker').attr("value")
    if (worker != "")
        data.worker = worker
    data.howlong = $('#howlong').attr("value")
    $.ajax({ type: "GET", url: "/api/events", data: data, dataType: "json", success: 
        function (data) 
        {
	        activities = data;
	        renderActivities ();
            document.getElementById("refreshbutton").className = "refreshbutton";
        }
    });
}

function renderActivities ()
{
	$("#activities").empty ();

	var table = "<table id='activitiesTable'>";
	table += "<tr class='title'>\n";

	// Returns the HTML code for a worker title column
	function addTitleHTML (attribute)
	{
        table += "<th class='headerCell' onclick='"+"setActivityKey(\""+attribute+"\")'>";	
		var value = activities[0];
		if (value && value[attribute] != null)
		{
			table += attribute;
			if (attribute == activitiesSortKey && activitiesSortKeyToUpper)
				table += " &#8595;";
			if (attribute == activitiesSortKey && !activitiesSortKeyToUpper)
				table += " &#8593;";
		}
		else
			table += attribute;
		table += "</th>";
	}

    addTitleHTML ("start");
    addTitleHTML ("job_id");
    addTitleHTML ("job_title");
    addTitleHTML ("state");
    addTitleHTML ("worker");
    addTitleHTML ("duration");

	table += "</tr>\n";

	function _sort (a,b)
	{
		var aValue = a[activitiesSortKey];
		if (typeof aValue == 'string')
			return compareStrings (aValue, b[activitiesSortKey], activitiesSortKeyToUpper);
		else
			return compareNumbers (aValue, b[activitiesSortKey], activitiesSortKeyToUpper);
	}

	activities.sort (_sort);

	for (i=0; i < activities.length; i++)
	{
		var activity = activities[i];

		date = formatDate (activity.start);
		dura = formatDuration (activity.duration);

        var mouseDownEvent = "onMouseDown='onClickList(event,"+i+")' onDblClick='onDblClickList(event,"+i+")'";
		table += "<tr id='activitytable"+i+"' "+mouseDownEvent+" class='entry"+(i%2)+(selectedActivities[activity.id]?"Selected":"")+"'>"+
		// table += "<tr id='activitytable"+i+"' class='entry"+(i%2)+(selectedActivities[activity.id]?"Selected":"")+"'>"+
		         "<td>"+date+"</td>"+
		         "<td>"+activity.job_id+"</td>"+
		         "<td>"+activity.job_title+"</td>"+
		         "<td class='"+activity.state+"'>"+activity.state+"</td>"+
		         "<td>"+activity.worker+"</td>"+
		         "<td>"+dura+"</td>"+
		         "</tr>\n";
	}

	// Footer
	table += "<tr class='title'>";
	table += addSumEmpty ("TOTAL");
	table += addSumSimple (activities);
	table += addSumEmpty ();
	table += addSumFinished (activities, "state");
	table += addSumEmpty ();
	table += addSumAvgDuration (activities, "duration");
	table += "</tr>\n";

	table += "</table>";
	$("#activities").append(table);
	$("#activities").append("<br>");
}

function renderAffinities ()
{
	$("#affinities").empty ();

	var table = "<table id='affinitiesTable'>";
	table += "<tr class='title'>\n";

	// Returns the HTML code for a worker title column
	function addTitleHTML (attribute)
	{
        table += "<th class='headerCell' onclick='"+"setActivityKey(\""+attribute+"\")'>";	
		var value = activities[0];
		if (value && value[attribute] != null)
		{
			table += attribute;
			if (attribute == activitiesSortKey && activitiesSortKeyToUpper)
				table += " &#8595;";
			if (attribute == activitiesSortKey && !activitiesSortKeyToUpper)
				table += " &#8593;";
		}
		else
			table += attribute;
		table += "</th>";
	}

    addTitleHTML ("id");
    addTitleHTML ("name");

	table += "</tr>\n";

	for (i = 1; i <= 63; ++i)
	{
		table += "<tr>";
		table += "<td width='50px'>"+i+"</td><td width='200px'><input type='edit' class='ttedit' id='affinity"+i+"' name='affinity' value='' onchange='onchangeaffinityprop ("+i+")'></td>"
		table += "</tr>\n";
	}

	updateAffinities ();

	table += "</table>";
	$("#affinities").append(table);
	$("#affinities").append("<br>");
}

function onchangeaffinityprop (affinity)
{
    $('#affinity'+affinity).css("background-color", "greenyellow");
}

function updateAffinities ()
{
    $.ajax({ type: "GET", url: "/api/affinities", dataType: "json", success: 
        function (data) 
        {
	        affinities = data;
	        for (i = 1; i <= 63; ++i)
	        {
	        	var def = affinities[i];
	        	if (def) {
			        $("#affinity"+i).attr("value", def);
				affinitieslist.push(def);
			}
			    $("#affinity"+i).css("background-color", "white");
			
	        }
		
            affinitieslist.sort();
            document.getElementById("refreshbutton").className = "refreshbutton";
        }
    });
}

function sendAffinities ()
{
	var affinities = {};
	for (i = 1; i <= 63; ++i)
	{
		var affinity = $("#affinity"+i).attr ("value");
		if (affinity != null)
			affinities[i] = affinity;
	}

	var data = JSON.stringify(affinities)
    $.ajax({ type: "POST", url: "/api/affinities", data: data, dataType: "json", success: 
        function (data) 
        {
			updateAffinities ();
        }
    });
}

var JobProps =
[
    [ "title", "title", "" ],
    [ "command", "cmd", "" ],
    [ "dir", "dir", "." ],
    [ "priority", "priority", "127" ],
    [ "affinity", "affinity", "" ],
    [ "timeout", "timeout", "0" ],
    [ "dependencies", "dependencies", "" ],
    [ "user", "user", "" ],
    [ "url", "url", "" ],
    [ "environment", "env", "" ]
];
var updatedJobProps = {}

function onchangejobprop (prop)
{
    updateSelectionProp (updatedJobProps, JobProps, prop);
}

function updatejobs ()
{
    sendSelectionPropChanges (jobs, 'id', updatedJobProps, JobProps, "Jobs", selectedJobs,
        function ()
        {

            reloadJobs ();
            updateJobProps ();
        }
    );
}

function addjob ()
{
	dependencies = $.trim($('#dependencies').attr("value"));
	dependencies = dependencies.split(',')
	dependencies = dependencies != "" ? dependencies : []
    var data = {
        title:$('#title').attr("value"),
        command:$('#cmd').attr("value"),
        dir:$('#dir').attr("value"), 
        env:$('#env').attr("value"), 
        priority:$('#priority').attr("value"), 
        timeout:$('#timeout').attr("value"),
        affinity:$('#affinity').attr("value"),
        dependencies:dependencies,
        user:$('#user').attr("value"),
        url:$('#url').attr("value"),
        parent:viewJob
    };
    $.ajax({ type: "PUT", url: "/api/jobs", data: JSON.stringify(data), dataType: "json", success: 
        function () 
        {
    		setSelectionDefaultProperties (JobProps);
            reloadJobs ();
        }
    });
}

function selectJobs ()
{
    var tag = document.getElementById("selectJobs").value;
    if (tag == "CUSTOM")
        ;
    else if (tag == "NONE")
        selectAll (false);
    else if (tag == "ALL")
        selectAll (true);
    else
        selectAll (true, tag);
}

function onDblClickList (e, i)
{
    if (page == "activities")
    {
        var activity = activities[i];
	    renderLog (activity.job_id);
    }
    else
    {
        var job = jobs[i];
	    job.command != "" ? renderLog (job.id) : goToJob (job.id);
	}
}

// List selection handler
function onClickList (e, i)
{
    if (!e) var e = window.event
    
    document.getElementById("selectJobs").value = "CUSTOM";
    
	// Unselect if not ctrl keys
	if (!e.ctrlKey)
	{
        if (page == "jobs")
        {
            selectedJobs = {};
        }
        else if (page == "workers")
            selectedWorkers = {};
        else if (page == "activities")
            selectedActivities = {};
    }

    var thelist;
    var selectedList;
    var idName;
    var tableId;
    if (page == "jobs")
    {
        thelist = jobs;
        selectedList = selectedJobs;
        idName = "id";
        tableId = "jobtable";
    }
    else if (page == "workers")
    {
        thelist = workers;
        selectedList = selectedWorkers;
        idName = "name";
        tableId = "workertable";
    }
    else if (page == "activities")
    {
        thelist = activities;
        selectedList = selectedActivities;
        idName = "id";
        tableId = "activitytable";
    }
    else
        return;
    
	// Unselect if not ctrl keys
	if (!e.ctrlKey)
	{
		for (j=0; j < thelist.length; j++)
			document.getElementById(tableId+j).className = "entry"+(j%2);
	}

	var begin = e.shiftKey ? Math.min (selectionStart, i) : i
	var end = e.shiftKey ? Math.max (selectionStart, i) : i

	selectionStart = e.shiftKey ? selectionStart : i;

	for (j = begin; j <= end; j++)
	{
		var item = thelist[j];
		if (item)
		{
			var selected = e.ctrlKey ? !selectedList[item[idName]] : true;
			selectedList[item[idName]] = selected;
			document.getElementById(tableId+j).className = "entry"+(j%2)+(selected?"Selected":"");
		}
	}
	
    if (page == "jobs")         { updateJobProps (); }
    else if (page == "workers") { updateWorkerProps (); }

    // Remove selection
    window.getSelection ().removeAllRanges();
}

function selectAll (state, filter)
{
    var thelist;
    var selectedList;
    var idName;
    var tableId;

    if (page == "jobs")
    {
        thelist = jobs;
        selectedJobs = {};
        selectedList = selectedJobs;
        idName = "id";
        tableId = "jobtable";
    }
    else if (page == "workers")
    {
        thelist = workers;
        selectedWorkers = {};
        selectedList = selectedWorkers;
        idName = "name";
        tableId = "workertable";
    }
    else
        return;
        
    if (!state)
    {
	gridjobs.setSelectedRows([]);
    }
    else
    {        
	    var selectarray = []
	    for (j=0; j < dataViewjobs.getLength(); j++) {
	 	    var item=dataViewjobs.getItem(j)
		    if (filter == null || item.state == filter)
		    {
		       if (item.id != undefined)
		          selectarray.push(item.id)
		    }
	    }
	    var selectedRows = dataViewjobs.mapIdsToRows(selectarray);
	    gridjobs.setSelectedRows(selectedRows);

    }
    
    if (page == "jobs")         { updateJobProps (); }
    else if (page == "workers") { updateWorkerProps (); }
}

function removeSelection ()
{
	if (confirm("Do you really want to remove the selected jobs ?"))
	{
	    var data = [];
		for (j=jobs.length-1; j >= 0; j--)
		{
			var job = jobs[j];
			if (selectedJobs[job.id])
			    data.push (job.id);
		}
        $.ajax({ type: "DELETE", url: "/api/jobs", data: JSON.stringify(data), dataType: "json", success: 
            function () 
            {
        		selectedJobs = {};
        	    reloadJobs ();
        	    updateJobProps ();
            }
        });
	}
}

function startSelection ()
{
    var data = [];
	for (j=jobs.length-1; j >= 0; j--)
	{
		var job = jobs[j];
		if (selectedJobs[job.id])
		    data.push (job.id);
	}
    $.ajax({ type: "POST", url: "/api/startjobs", data: JSON.stringify(data), dataType: "json", success: 
        function () 
        {
    	    reloadJobs ();
        }
    });
}

function viewSelection()
{
	for (j=jobs.length-1; j >= 0; j--)
	{
		var job = jobs[j];
		if (selectedJobs[job.id] && job.url)
		    window.open(job.url);
	}
}

function resetSelection ()
{
	if (confirm("Do you really want to reset the selected jobs and all their children jobs ?"))
	{
	    var data = [];
		for (j=jobs.length-1; j >= 0; j--)
		{
			var job = jobs[j];
			if (selectedJobs[job.id])
			    data.push (job.id);
		}
        $.ajax({ type: "POST", url: "/api/resetjobs", data: JSON.stringify(data), dataType: "json", success: 
            function () 
            {
        	    reloadJobs ();
            }
        });
	}
}

function resetErrorSelection ()
{
	if (confirm("Do you really want to reset the selected jobs and all their children jobs tagged in ERROR ?"))
	{
	    var data = [];
		for (j=jobs.length-1; j >= 0; j--)
		{
			var job = jobs[j];
			if (selectedJobs[job.id])
			    data.push (job.id);
		}
        $.ajax({ type: "POST", url: "/api/reseterrorjobs", data: JSON.stringify(data), dataType: "json", success: 
            function () 
            {
        	    reloadJobs ();
            }
        });
	}
}

function pauseSelection ()
{
    var data = [];
	for (j=jobs.length-1; j >= 0; j--)
	{
		var job = jobs[j];
		if (selectedJobs[job.id])
		    data.push (job.id);
	}
    $.ajax({ type: "POST", url: "/api/pausejobs", data: JSON.stringify(data), dataType: "json", success: 
        function () 
        {
    	    reloadJobs ();
        }
    });
}

function updateJobProps ()
{
    updatedJobProps = checkSelectionProperties (jobs, JobProps, selectedJobs, "id");
}

function exportCSV()
{
	window.open('csv.html?id=' + viewJob);
}

function cutSelection ()
{
    cutJobs = {}
	for (j=jobs.length-1; j >= 0; j--)
	{
		var job = jobs[j];
		if (selectedJobs[job.id])
		{
		    cutJobs[job.id] = true
        }
	}
	selectAll (false)
}

function pasteSelection ()
{
    var count = 0;
    var data = {}
	for (var id in cutJobs)
		data[id] = {parent:viewJob}
    $.ajax({ type: "POST", url: "/api/jobs", data: JSON.stringify(data), dataType: "json", success: 
        function () 
        {
    	    reloadJobs ();
        }
    });
}
