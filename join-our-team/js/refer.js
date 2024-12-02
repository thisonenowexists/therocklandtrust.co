//Remap the referWidget function. This is adding the window.referWidget.c() to make sure the referWidget() calls execute the function to process them
//This is done at the beginning so we don't have to iterate over every property added later.
window.referWidget.remap = (function(old){
	window.referWidget = function() {
		(window.referWidget.q = window.referWidget.q || []).push(arguments);
		window.referWidget.c();
	};
	//Make sure to include any property that comes with the old function
	for (var key in old) {
		if (Object.prototype.hasOwnProperty.call(old, key)) {
			var val = old[key];
			window.referWidget[key] = old[key]
		}
	}
})(referWidget);

// TODO: Find a cleaner way to detect if its IE8/IE9
window.referWidget.process = (function(){

	/** Variable initialization **/
	// baseUrl: URL to fetch local files (HTMLs/CSSs/JSs)
	// TODO: Find a better way to dynamically select if we are in a development or production environment
	// TODO: IMPORTANT - Change this back to https://widget-dot-refer-io.appspot.com before releasing
	var baseUrl = (location.protocol == "file:") ? "http://localhost:8080" : "https://widget-dot-refer-io.appspot.com";

	// API PATH
	var apiUrl = "https://widget-dot-refer-io.appspot.com/api/v1";

	// Flags if subscription process has been completed.
	var subscriptionCompleted = false;

	var init = function(o, e){

		// var client = algoliasearch('48YU7PR3Z6', '831bd24a60e7a77995042d9c3a4eb02d');
		// var index = client.initIndex('clean_job_titles');

		// Widget options
		// api_key (REQUIRED):  Sets the api key of the employer where the widget is currently being displayed.
		// style (OPTIONAL): Sets the style used to display the widget. Possible options are wide | sidebar | sidebar_no_bootstrap.
		// source (OPTIONAL): Represents the request's page type.
		// name (OPTIONAL): Prepopulates the name field.
		// email (OPTIONAL): Prepopulates the email field.
		// phbne (OPTIONAL): Prepopulates the phone field
		// title (OPTIONAL): Job title of the current page the user is viewing. Usually provided in thankyou pages and specific job sites.
		// aid (OPTIONAL): Application id of the user subscribed. Usually provided by a thankyou page to request a resume after the subscription is done.
		// referrer_user_id (OPTIONAL): Id for the user who is referring the new signup.
		// referral_source (OPTIONAL): Source string for the referral
		var options = o;

		var element = e;

		// If sent element is a jquery object, retrieve actual dom element from it
		if(window.jQuery !== undefined && element instanceof window.jQuery){
			element =  e[0];
		}

		// if a new baseUrl or apiUrl is sent
		if(options.hasOwnProperty("base_url")){
			baseUrl = options.base_url;
		}

		if(options.hasOwnProperty("api_url") && options.api_url !== null && options.api_url != ""){
			apiUrl = options.api_url;
		}

		var collectResumes = true;
		var collectOptIns = true;
		var collectQuestionnaire = true;
		var querySource = "";
		var companyName = "";
		var predictedJobTitle = undefined;
		var predictedLocation = "";
		var timezone = window.Intl !== undefined ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

		// Holds phone until so we don't post phone number if not accepted
		var tempPhone = "";

		var pathname = "/signup";

		// Add widget stylesheet
		// This is added at this moment because IE8/IE9 uses some styles for the popup button in some situations.
		utils.addStyleTag(baseUrl+"/assets/stylesheets/widget.css");

		// If browser is IE < 9 show a popup
		if(utils.isIE() && utils.isIE() <= 9 && window.location.pathname != pathname){

			var parameters = utils.buildQueryStringFromObject(options);

			parameters = parameters.slice(0, - 1);

			var signup_url = baseUrl + pathname + parameters;

			if(options.style == "fixed"){

				var div = document.createElement("div");
				div.id = "refer-widget-" + utils.generateUniqueId();
				div.className = "refer-widget refer-" + options.style;

				div.innerHTML = '<a href="' + signup_url +'" class="refer-popup-button refer-ie-popup refer-primary-background-color" title="Sign up for job Alerts">Sign up for Job Alerts!</a>';

				// Insert div before script tag
				element.appendChild(div, element);

				element = div;

			}else{

				element.innerHTML = '<a href="' + signup_url +'" class="refer-popup-button refer-ie-popup" style="text-align: center; display: block; background-color: #c0c0c0; padding: 10px; color: #ffffff; border-radius: 5px;" title="Sign up for job Alerts">Click Here!</a>';

			}

			utils.addEventListener(element, "click", function(event){

				event = event || window.event;
				event.preventDefault ? event.preventDefault() : (event.returnValue = false);
				var popupHeight = 300;
				var popupWidth = 400;
				var popupLeft = (screen.width/2)-(popupWidth/2);
				var popupTop = (screen.height/2)-(popupHeight/2);

				var newWindow = window.open(signup_url, "_blank","width=400,height=400,left=" + popupLeft + ",top=" + popupTop);
				if (window.focus) {newWindow.focus()}

			});

			return;
		}

		// Validate API key and get employers data
		// Pre-flight request
		var preflightOptions = {
			api_key: options.api_key,
			job_title: options.title
		}

		utils.getJSON("https://go-api-dot-refer-io.appspot.com/api/v3/widget/preflight" + utils.buildQueryStringFromObject(preflightOptions), function(response){

			// If the response is not valid
			if(response.hasOwnProperty("error")){
				console.log("Refer.io Widget couldn't load properly because the api key is not valid.");
				return;
			}

			// Setup internal options
			collectResumes = response.employer.collectResumes;
			collectOptIns = response.employer.collectOptIns;
			collectQuestionnaire = (response.employer.collectOptIns && response.employer.collectResumes ? true : false); //make sure to not collect Questionnaire if employer has disabled collectResumes or collectOptIns.
			companyName = response.employer.name;
			tempPhone = (options.phone ? options.phone : "");
			// predictedJobTitle = (response.search_term ? response.search_term : "");
			predictedLocation = (response.location ? response.location : "");
			// querySource = (response.search_term && response.search_term != "" ? "cleaner" : "");

			predictedJobTitle = (options.title ? options.title : "");
			querySource = (options.title && options.title != "" ? "prepopulated" : "");

			// //If we can't predict the job title then prepopulate with industry
			// if((!predictedJobTitle || predictedJobTitle == "") && response.employer && response.employer.industry && response.employer.industry != ""){
			// 	predictedJobTitle = response.employer.industry;
			// 	querySource = "industry";
			// }

			// Don't collect resumes if browser is IE8/IE9
			if(utils.isIE() && utils.isIE() <= 9){
				collectResumes = false;
			}

			setup();

		});

		function setup(){

			// If no style was supplied in the options object then fallback to fixed
			if(options.style === undefined){
				options.style = "fixed";
			}

			// Set primary and text colors if provided in the options object
			if(options.primary_color || options.text_color){

				var sheet = utils.createStyleSheet();

				if(options.primary_color){

					utils.addCSSRule(sheet, ".refer-primary-background-color", "background-color: " + options.primary_color + ";", 0);
					utils.addCSSRule(sheet, ".refer-primary-color", "color: " + options.primary_color + ";", 0);

				}

				if(options.text_color){

					utils.addCSSRule(sheet, ".refer-primary-background-color", "color: " + options.text_color + ";", 0);

				}

			}

			// Get template
			utils.getJSON(baseUrl + "/templates/widget?style=" + options.style, function(data){

				// Create a div
				var div = document.createElement("div");
				div.id = "refer-widget-" + utils.generateUniqueId();
				div.className = "refer-widget refer-" + options.style;

				// If style is fixed then add the necessary HTML to handle the expected behavior
				if(options.style == "fixed"){

					// If browser is IE < 9 then dont show the bottom right corner button.
					if(utils.isIE() && utils.isIE() <= 9){

						data.html = "<div class='fixed-container' style='display:block; bottom:initial !important; top: 0;'>" + data.html + "</div>";

					}else{

						div.classname += div.className + "fixed"
						data.html = "<div class='fixed-button refer-primary-background-color'>Receive job alerts!</div><div class='fixed-container'>" + data.html + "</div>";

					}

				}

				// Set the response's html to the new div's innerHTML
				div.innerHTML = data.html;

				// Insert div before script tag
				element.appendChild(div, element);

				element = div;

				// Add header to fixed style widget OR IE8/IE9
				if(options.style == "fixed" || utils.isIE() && utils.isIE() <= 9){

					var generalPane = element.querySelector(".refer-general-pane");
					var fixedHeaderElement = document.createElement("div");
					fixedHeaderElement.className = "refer-big-header";
					fixedHeaderElement.innerHTML = "<span class='refer-primary-color'>Sign Up For Job Alerts!</span>";

					generalPane.insertBefore(fixedHeaderElement, generalPane.firstChild);

				}

				// Setup widget. Prepopulate values
				element.querySelector("#refer-name").value = (options.name ? options.name : "");
				element.querySelector("#refer-email").value = (options.email ? options.email : "");
				element.querySelector("#refer-frequency").value = utils.todayFrequency();

				// IF is not IE < 9 then prepopulate the location input
				if(!utils.isIE() || utils.isIE() > 9){
					element.querySelector("#refer-location").value = predictedLocation;
				}

				// If there's application id don't collect resumes. Resumes are collected with aid.
				if(options.aid != null && options.aid != ""){
					collectResumes = false;
				}

				main(element, options);
			});

		}

		function main(){

			// autocomplete(element.querySelector("#refer-title"),
			// 	{
			// 		hint: false,
			// 		autoWidth: false,
			// 		appendTo: element.querySelector("#refer-title-container")
			// 	},
			// 	{
			// 		source: autocomplete.sources.hits(index, {hitsPerPage: 5}),
			// 		//value to be displayed in input control after user's suggestion selection
			// 		displayKey: 'Title',
			// 		//hash of templates used when rendering dataset
			// 		templates: {
			// 			//'suggestion' templating function used to render a single suggestion
			// 			suggestion: function(suggestion) {
			// 				return '<span>' + suggestion._highlightResult.Title.value + '</span>';
			// 			}
			// 		}
			// 	}
			// ).on('autocomplete:selected', function(event, suggestion, dataset) {
			// 	querySource = "autocomplete";
			// });

			//Prepopulate title
			//Used to modify the job title pane's html to show title in bold.
			// if(predictedJobTitle && !/^\s*$/.test(predictedJobTitle)){
			// 	element.querySelector("#refer-predicted-job-title").innerHTML = predictedJobTitle.replace(/\(.*?\)/g, "").replace(/\s-\s.*/g, "");
			// 	element.querySelector("#refer-prediction-successful").style.display = "inline";
			// 	element.querySelector("#refer-prediction-unsuccessful").style.display = "none";
			// }

			// Add fixed button handlers.
			if(!(utils.isIE() && utils.isIE() <= 9) && options.style == "fixed"){

				var fixedButton = element.querySelector(".fixed-button");
				var fixedContainer= element.querySelector(".fixed-container");

				utils.addEventListener(fixedButton, "click", function(){
					fixedContainer.style.display = "block";
					fixedButton.style.display = "none";
				});

				utils.addEventListener(document, "click", function(e){

					if (utils.matches(e.target, '.fixed-container, .fixed-container *, .fixed-button')) {
						return;
					}

					fixedContainer.style = "none";
					fixedButton.style.display = "block";

					// If subscription process is completed then don't show the fixed button again.
					if(subscriptionCompleted){ fixedButton.style.display = "none"; }

				});

			}

			//**Validation and Event handlers**/

			// First pane
			var nameInput = element.querySelector("#refer-name");
			var emailInput = element.querySelector("#refer-email");
			var locationInput = element.querySelector("#refer-location");
			var tosAcceptInput = element.querySelector("#refer-tos-accept");
			var firstPaneButton = element.querySelector(".refer-first-pane-btn");


			//Only instantiate Google Places API on focus.
			//The reason for this is that when instantiating the object, Google will do an API Autocomplete request if the input has a value.
			//This was causing the API to receive unnecessary requests.
			// var stateAutocompleteObject = undefined;
			// utils.addEventListener(locationInput, "focus", function(){

			// 	if(stateAutocompleteObject == undefined){
			// 		stateAutocompleteObject = new google.maps.places.Autocomplete(locationInput, { types: ["(cities)"], fields: ['name'], componentRestrictions: {country: 'us'} });
			// 	}

			// });

			utils.addEventListener(nameInput, "focusout", function(){
				validateInput(nameInput.value == "" || utils.isNumeric(nameInput.value), nameInput, firstPaneButton);
			});

			utils.addEventListener(emailInput, "focusout", function(){
				validateInput(!utils.isEmailValid(emailInput.value), emailInput, firstPaneButton);
			});

			utils.addEventListener(locationInput, "focusout", function(){
				validateInput(locationInput.value == null || locationInput.value == "" || locationInput.value == "-1", locationInput, firstPaneButton);
			});

			utils.addEventListener(locationInput, "change", function(){
				validateInput(locationInput.value == null || locationInput.value == "" || locationInput.value == "-1", locationInput, firstPaneButton);
			});

			utils.addEventListener(firstPaneButton, "click", function(){

				var c1 = validateInput(nameInput.value == "" || utils.isNumeric(nameInput.value), nameInput, firstPaneButton);

				var c2 = validateInput(!utils.isEmailValid(emailInput.value), emailInput, firstPaneButton);

				var c3 = validateInput(locationInput.value == null || locationInput.value == "" || locationInput.value == "-1", locationInput, firstPaneButton);

				var c4 = validateInput(tosAcceptInput.checked == false, tosAcceptInput, firstPaneButton);

				if(!c1 && !c2 && !c3 && !c4){

					// IF is not IE < 9 then get the Autocomplete value from the location input
					// if(!utils.isIE() || utils.isIE() > 9){

					// 	if(stateAutocompleteObject != undefined){

					// 		var stateAutocompleteSelectedLocation = stateAutocompleteObject.getPlace()

					// 		if(stateAutocompleteSelectedLocation !== undefined){

					// 			locationInput.value = stateAutocompleteSelectedLocation.name;

					// 		}

					// 	}

					// }

					showNextPane(element);

				}

			});

			// Second pane
			var referOptButtons = element.querySelectorAll(".refer-opt-btn");

			utils.forEach(referOptButtons, function(index, value){

				utils.addEventListener(value, "click", function(event){

					event = event || window.event;
					var target = event.target || event.srcElement;

					var frequencyInput = element.querySelector("#refer-frequency");
					var optInInput = element.querySelector("#refer-opt-in");

					optInInput.value = target.getAttribute("data-opt-in");

					// Set frequency. We don't need to update weekly frequencies, because that's prepopulated on setup
					if(target.getAttribute("data-frequency") == "daily"){
						frequencyInput.value = "sun,mon,tue,wed,thu,fri,sat";
					}

					if(optInInput.value == "yes"){

						element.querySelector("#refer-upload-message").innerHTML = "Refer.io currently has over 30,000 opportunities in our database. To ensure that we don't waste your time looking at jobs that don't fit you, please provide us with your resume.";

					}else{

						element.querySelector("#refer-upload-message").innerHTML =  "No problem, we will only send you jobs from " + companyName + ".  If you upload your resume below, we will use it to better match you with their job openings."

					}

					showNextPane(element);

				});

			});

			// Third pane
			var titleInput = element.querySelector("#refer-title");
			var thirdPaneButton = element.querySelector(".refer-second-pane-btn");

			//No need to validate title atm. Clean title is being sent everytime if there's no value for title inputy
			utils.addEventListener(titleInput, "change", function(){
				validateInput((titleInput.value == "" || titleInput.value == null) && (!predictedJobTitle || predictedJobTitle == ""), titleInput, thirdPaneButton);
			});

			//Set querySource variable
			utils.addEventListener(titleInput, "keyup", function(){
				querySource = "user";
			});

			utils.addEventListener(thirdPaneButton, "click", function(){
				var c1 = validateInput((titleInput.value == "" || titleInput.value == null) && (!predictedJobTitle || predictedJobTitle == ""), titleInput, thirdPaneButton);

				if(!c1){
					showNextPane(element);
				}
			});

			// Fourth Pane

			var resumeLabel = element.querySelector(".refer-file-label");
			var resumeInput = element.querySelector("#refer-resume-input");
			var submitButton = element.querySelector(".refer-submit-btn");
			var uploadLaterButton = element.querySelector(".refer-submit-no-file-btn");

			utils.addEventListener(submitButton, "click", function(){
				var c1 = validateInput(resumeInput.value == "", resumeLabel, submitButton);
				if(!c1){
					showNextPane(element);
				}
			});

			utils.addEventListener(resumeLabel, "change", function(){
				validateInput(resumeInput.value == "", resumeLabel, submitButton);
			});

			utils.addEventListener(resumeInput, "change", function(){
				resumeLabel.value = resumeInput.value;
				utils.trigger(resumeLabel, "change");
			});

			utils.addEventListener(uploadLaterButton, "click", function(){
				showNextPane(element);
			});
			// widgetContainerSelector.on("click", ".refer-submit-no-file-btn", function(){
			// 	submit_form(false);
			// });

			// Validate phone pane
			var phoneInput = element.querySelector("#refer-phone");
			var phoneConfirmInput = element.querySelector("#refer-phone-confirm");
			var phonePaneButton = element.querySelector(".refer-phone-btn");

			utils.addEventListener(phoneInput, "focusout", function(){
				validateInput(phoneInput.value == null || phoneInput.value.match(/\d/g) == null || phoneInput.value.match(/\d/g).length !== 10, phoneInput, phonePaneButton);
			});

			utils.addEventListener(phoneConfirmInput, "change", function(){
				validateInput(phoneConfirmInput.value == "false", phoneConfirmInput, phonePaneButton);
			});

			utils.addEventListener(phonePaneButton, "click", function(){
				var c = validateInput(phoneInput.value == null || phoneInput.value.match(/\d/g) == null|| phoneInput.value.match(/\d/g).length !== 10, phoneInput, phonePaneButton);
				var c1 = validateInput(phoneConfirmInput.value == "false", phoneConfirmInput, phonePaneButton);

				if(!c && !c1){
					showNextPane(element);
				}

			});

			// User clicked no in receive SMS
			var noPhonePaneButton = element.querySelector(".refer-no-phone-btn");

			utils.addEventListener(noPhonePaneButton, "click", function(){

				phoneInput.value = "";
				showNextPane(element);

			});

			// Validate questionnaire pane
			var educationInput = element.querySelector("#refer-education");
			var workInput = element.querySelector("#refer-work");
			var jobSearchInput = element.querySelector("#refer-job-search");
			var seekingInput = element.querySelector("#refer-seeking");
			var typeInput = element.querySelector("#refer-type");
			var questionnaireBtn = element.querySelector(".refer-questionnaire-pane-btn");

			utils.addEventListener(questionnaireBtn, "click", function(){
				var c1 = validateInput(educationInput.value == -1, educationInput, questionnaireBtn);
				var c2 = validateInput(workInput.value == -1, workInput, questionnaireBtn);
				var c3 = validateInput(jobSearchInput.value == -1, jobSearchInput, questionnaireBtn);
				var c4 = validateInput(seekingInput.value == -1, seekingInput, questionnaireBtn);
				var c5 = validateInput(typeInput.value == -1, typeInput, questionnaireBtn);

				if(!c1 && !c2 && !c3 && !c4 && !c5){
					showNextPane(element);
				}

			});

		}

		var showNextPane = function(){
			// widget panel numbers
			// #0general user info data
			// #1 opt in
			// #2 categories
			// #3 resume upload pane

			// Pane flow process

			// show pane 1

			// if show_opt_pane

			// 	 show opt pane

			// 	 if opt in

			// 		show category pane
			// 		show resume pane
			// 		show thankyou page

			// 	 else

			// 		if collect-resume = no
			// 			show thank you page
			// 		else
			// 			show resume pane

			// else
			// 	if collect-resume = no
			// 		show thankyou page
			// 	else
			// 		show resume pane

			var paneMap = {

				"general" : {
					index: 0,
					order: 1
				},

				"optin" : {
					index: 1,
					order: 2
				},

				"title" : {
					index: 2,
					order: 3
				},

				"resume" : {
					index: 3,
					order: null
				},

				"thank" : {
					index: 4,
					order: 6
				},

				"upload-msg" : {
					index: 5,
					order: null
				},

				"phone" : {
					index: 6,
					order: 5
				},

				"questionnaire" : {
					index: 7,
					order: 4
				}

			}


			// pane to show
			var contentPanes = element.querySelectorAll(".refer-pane");

			var activePaneName = element.querySelector(".refer-active").getAttribute("data-pane-name");

			var paneToShow;
			for(var p in paneMap){

				if(paneMap[activePaneName].order + 1 == paneMap[p].order){
					paneToShow = p;
					break;
				}

			}

			var optInInput = element.querySelector("#refer-opt-in");

			// Check if file is ready
			var fileReady = (element.querySelector("#refer-resume-input").value == "") ? false : true;

			// This variable will be used to store the callback function after posting IF NECESSARY
			var callback;

			switch(paneToShow){

				case "optin":

					if(!collectOptIns){

						if(collectResumes){

							// paneToShow = "resume";
							paneToShow = "questionnaire";

						}else{

							paneToShow = "thank";
							fileReady = false;
						}

					}

					break;

				case "title":

					if(optInInput.value == "no"){

						if(collectResumes){

							// paneToShow = "resume";
							paneToShow = "thank";

						}else{

							paneToShow = "thank";
							fileReady = false;

						}

					}

					break;

				case "resume":

					if(!collectResumes){

						paneToShow = "thank";
						fileReady = false;

					}

					break;

				case "thank":

					if(fileReady){
						paneToShow = "upload-msg";

						// TODO: Refactor callback to avoid code repetition
						callback = function(){
							subscriptionCompleted = true;

							contentPanes[paneMap["upload-msg"].index].style.display = "none";
							utils.removeClass(contentPanes[paneMap["upload-msg"].index], "refer-active");

							contentPanes[paneMap["thank"].index].style.display = "block";
							utils.addClass(contentPanes[paneMap["thank"].index], "refer-active");
						}

					}

					break;

				case "phone":
					if(optInInput.value == "no"){
						paneToShow = "thank";
					}else{
						var phoneInput = element.querySelector("#refer-phone");
						phoneInput.value = tempPhone;

						var phonePaneTitle = element.querySelector("#phone-pane-title");
						var phonePaneLocation = element.querySelector("#phone-pane-location");

						phonePaneTitle.innerHTML = element.querySelector("#refer-title").value || predictedJobTitle;
						phonePaneLocation.innerHTML = element.querySelector("#refer-location").value;
					}
					break;

				case "questionnaire":
						if(!collectQuestionnaire || optInInput.value == "no"){ //We're skipping phone pane too right now.
							paneToShow = "thank";
						}
						break;

			}

			// Refer Form
			var referForm = element.querySelector("#refer-widget-form");

			var data = {
				pane_number: paneMap[paneToShow].index,
				url: window.location.href,
				file_ready: fileReady,
				query_source: querySource,
				client_key: options.api_key,
				source: options.source,
				aid:  options.aid,
				referrer: document.referrer, //URI of the page that linked to this page.
				referrer_user_id: options.referrer_user_id, //Referrer user id.
				referral_source: options.referral_source, //Referral source
				title: element.querySelector("#refer-title").value || predictedJobTitle,
				timezone: timezone
			};

			if(paneToShow == "thank"){

				subscriptionCompleted = true;

			}

			utils.submitForm(referForm, apiUrl + "/widget", data, callback);
			contentPanes[paneMap[activePaneName].index].style.display = "none";
			utils.removeClass(contentPanes[paneMap[activePaneName].index], "refer-active");

			contentPanes[paneMap[paneToShow].index].style.display = "block";
			utils.addClass(contentPanes[paneMap[paneToShow].index], "refer-active");

		}

	}

	//Error condition
	var validateInput = function(condition, selector, btn_to_disable){

		if(condition){

			utils.addClass(selector, "refer-error-input");

			selector.parentNode.querySelectorAll(".refer-error-bubble")[0].style.display = 'block';

		}else{

			utils.removeClass(selector, "refer-error-input");

			selector.parentNode.querySelectorAll(".refer-error-bubble")[0].style.display = 'none';

		}

		return condition;
	}

	var utils = {

		isIE: function() {
			var myNav = navigator.userAgent.toLowerCase();
			return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
		},

		isNumeric: function(n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},

		isEmailValid: function(email) {
			var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
			return re.test(email);
		},

		buildQueryStringFromObject: function(obj){

			var queryString = "?";

			for (var k in obj) {

				if (obj.hasOwnProperty(k)) {

					if(k != "style"){
						queryString += k + "=" +  encodeURIComponent(obj[k]) + "&";
					}

				}
			}

			return queryString;
		},

		generateUniqueId: function(){
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
					return v.toString(16);
			});
		},

		addStyleTag: function(url){
			var tag = document.createElement("link");
			tag.rel = "stylesheet";
			tag.type = "text/css";
			tag.href =  url;
			tag.media = "all";
			document.getElementsByTagName('head')[0].appendChild(tag);
		},

		createStyleSheet: function(){

			// Create the <style> tag
			var style = document.createElement("style");

			// WebKit hack :(
			style.appendChild(document.createTextNode(""));

			// Add the <style> element to the page
			document.head.appendChild(style);

			return style.sheet;

		},

		addCSSRule: function(sheet, selector, rules, index){

			if("insertRule" in sheet) {
				sheet.insertRule(selector + "{" + rules + "}", index);
			}
			else if("addRule" in sheet) {
				sheet.addRule(selector, rules, index);
			}

		},

		addEventListener: function (el, eventName, handler) {
			if (el.addEventListener) {
				el.addEventListener(eventName, handler);
			} else {
				el.attachEvent('on' + eventName, function(){
					handler.call(el);
				});
			}
		},

		forEach: function (array, callback, scope) {
			for (var i = 0; i < array.length; i++) {
				callback.call(scope, i, array[i]); // passes back stuff we need
			}
		},

		indexOf: function(array, item) {
			for (var i = 0; i < array.length; i++) {
				if (array[i] === item)
				return i;
			}
			return -1;
		},

		matches: function(el, selector) {
			var _matches = (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector);

			if (_matches) {
			return _matches.call(el, selector);
			} else {
			var nodes = el.parentNode.querySelectorAll(selector);
			for (var i = nodes.length; i--;) {
				if (nodes[i] === el)
				return true;
			}
			return false;
			}
		},

		addClass: function (el, className){
			if (el.classList)
				el.classList.add(className);
			else
				el.className += ' ' + className;
		},

		removeClass: function(el, className){
			if (el.classList)
				el.classList.remove(className);
			else
				el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
		},

		children: function(el){
			var children = [];
			for (var i = el.children.length; i--;) {
				// Skip comment nodes on IE8
				if (el.children[i].nodeType != 8)
				children.unshift(el.children[i]);
			}
		},

		trigger: function(el, event){

			if (document.createEvent) {

				var event = document.createEvent('HTMLEvents');
				event.initEvent('change', true, false);
				el.dispatchEvent(event);

			} else {

				el.fireEvent('onchange');

			}

		},

		//Returns today's frequency string
		todayFrequency: function(){
			var d = new Date();
			var weekday = new Array(7);

			weekday[0] = "sun";
			weekday[1] = "mon";
			weekday[2] = "tue";
			weekday[3] = "wed";
			weekday[4] = "thu";
			weekday[5] = "fri";
			weekday[6] = "sat";

			return weekday[d.getDay()];
		},

		getJSON: function(url, callback){

			var request;

			if (window.XMLHttpRequest && (!utils.isIE() || utils.isIE() > 9)){

				request = new XMLHttpRequest();
				request.open("GET", url, true);

				request.onreadystatechange = function() {

					if (this.readyState === 4) {

						if (this.status >= 200 && this.status < 400) {

							// Success!
							var response = JSON.parse(this.responseText);

							callback(response);

						} else {
							// Error :(
							console.log("There was an error with a request");
						}

					}

				};

				request.send();
				request = null;

			} else if(window.XDomainRequest){

				request = new XDomainRequest();

				if (request) {

					request.onerror = function(){
						console.log("There was am error with a request.")
					};

					request.ontimeout = function(){
						console.log("Request Timout")
					};

					request.onprogress = function(){

					};

					request.onload = function(){

						if(typeof callback === "function"){
							callback(JSON.parse(request.responseText));
						}

					};

					request.timeout = 10000;
					request.open("GET",url);
					request.send();

				}

			}else{

				console.log("CORS not supported.")

			}

		},

		submitForm: function(formElement, url, data, callback){

			// Clean data object
			for(k in data){

				if(data.hasOwnProperty(k)){
					if(data[k] === undefined){
						delete data[k];
					}
				}

			}

			// Variable to hold the request object
			var request;

			if (window.XMLHttpRequest && (!utils.isIE() || utils.isIE() > 9)){

				request = new XMLHttpRequest();

				var f = new FormData(formElement);

				// Append extra data to the FormData object
				for (var k in data){

					if (data.hasOwnProperty(k)) {
						f.append(k, data[k]);
					}

				}

				request.open("POST",url,true);
				request.send(f);

				request.onreadystatechange = function() {

					if (this.readyState === 4) {

						if (this.status >= 200 && this.status < 400) {

							// Success!
							var response = JSON.parse(this.responseText);

							if(typeof callback === "function") callback(response);

						} else {
							// Error :(
							console.log("There was an error with a request");
						}

					}

				};

			} else if(window.XDomainRequest){

				// Get all inputs, selects and textareas from form
				var inputs = formElement.querySelectorAll("input, select, textarea");

				// Build data object
				this.forEach(inputs, function(index, input){

					if(input.name !== undefined && input.name != "" && input.value !== undefined && input.value != ""){
						data[input.name] = input.value;
					}

				});

				var dataString = s = this.buildQueryStringFromObject(data).substr(1);

				request = new XDomainRequest();

				if (request) {

					request.onerror = function(){
						console.log("There was an error with a request.")
					};

					request.ontimeout = function(){
						console.log("Request Timout")
					};

					request.onprogress = function(){

					};

					request.onload = function(){

						if(typeof callback === "function"){
							callback(JSON.parse(request.responseText));
						}

					};

					request.timeout = 10000;
					request.open("POST",url);
					request.send(dataString);

				}
			}

		}

	}

	// The returned function
	return init;

}());

//Ensures there will be no 'console is undefined' errors (IE8/IE9)
window.console = window.console || (function(){
    var c = {}; c.log = c.warn = c.debug = c.info = c.error = c.time = c.dir = c.profile = c.clear = c.exception = c.trace = c.assert = function(){};
    return c;
})();

// Store ready value
window.referWidget.isReady = false;

// All values have to be ready before executing c()
window.referWidget.readyMap = {
	"ready":  false,
	//"google": false,
	// "algolia": false,
	//"autocomplete": false
}

// When maps.google finishes loading, this function is executed
window.referWidget.googleReady = function(path, status){
	if(status == "ok"){
		window.referWidget.readyMap.google = true;
		window.referWidget.validateAndStart();
	}
}

// When algolia finishes loading, this function is executed
window.referWidget.algoliaReady = function(path, status){
	if(status == "ok"){
		window.referWidget.readyMap.algolia = true;
		window.referWidget.validateAndStart();
	}
}

// When autocomplete finishes loading, this function is executed
window.referWidget.autocompleteReady = function(path, status){
	if(status == "ok"){
		window.referWidget.readyMap.autocomplete = true;
		window.referWidget.validateAndStart();
	}
}

// When dom ready, this function is executed
window.referWidget.eventReady = function(){

	// Remove load EventListeners
	if ( document.addEventListener ) {
		document.removeEventListener( "DOMContentLoaded", window.referWidget.eventReady );
		window.removeEventListener( "load", window.referWidget.eventReady );

	} else {
		document.detachEvent( "onreadystatechange", window.referWidget.eventReady );
		window.detachEvent( "onload", window.referWidget.eventReady );
	}

	window.referWidget.readyMap.ready = true;
	window.referWidget.validateAndStart();
}


//When all dependencies are ready, start widget processing.
window.referWidget.hasApplicationStarted = false;
window.referWidget.validateAndStart = function(){
	if(!window.referWidget.hasApplicationStarted &&
		//window.referWidget.readyMap.google &&
		// window.referWidget.readyMap.algolia &&
		//window.referWidget.readyMap.autocomplete &&
		window.referWidget.readyMap.ready){

		window.referWidget.hasApplicationStarted = true;
		window.referWidget.c();
	}
}

// Execute widget's code
window.referWidget.c = function(){

	window.referWidget.isReady = true;

	if("q" in window.referWidget){

		while(window.referWidget.q.length){

			var action = window.referWidget.q.pop();

			switch (action[0]) {

				case "create":

					var options = action[1];

					// If has selector
					var element = document.querySelector("#" + action[2]) || function(){

						console.log("No element id detected. Falling back to fixed style.");

						options.style = "fixed";

						return document.body;
					}();

					window.referWidget.process(options, element);

					break;

				default:
					console.log("Refer.io widget invalid action.")
					break;
			}

		}

	}

}

//Load a script and callback when complete or error
referWidget.loadScript = function(path, callback) {

    var done = false;
    var scr = document.createElement('script');

    scr.onload = handleLoad;
    scr.onreadystatechange = handleReadyStateChange;
    scr.onerror = handleError;
    scr.src = path;
    document.body.appendChild(scr);

    function handleLoad() {
        if (!done) {
            done = true;
            callback(path, "ok");
        }
    }

    function handleReadyStateChange() {
        var state;

        if (!done) {
            state = scr.readyState;
            if (state === "complete") {
                handleLoad();
            }
        }
    }
    function handleError() {
        if (!done) {
            done = true;
            callback(path, "error");
        }
    }
}

// Ready event
if ( document.readyState === "complete" || ( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	window.referWidget.eventReady();

// Standards-based browsers support DOMContentLoaded
} else if ( document.addEventListener ) {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", window.referWidget.eventReady );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", window.referWidget.eventReady );

// If IE event model is used
}else{

	// Ensure firing before onload, maybe late but safe also for iframes
	document.attachEvent( "onreadystatechange", window.referWidget.eventReady );

	// A fallback to window.onload, that will always work
	window.attachEvent( "onload", window.referWidget.eventReady );

	// If IE and not a frame
	// continually check to see if the document is ready
	window.referWidget.top = false;

	try {
		window.referWidget.top = window.frameElement == null && document.documentElement;
	} catch ( e ) {}

	if ( window.referWidget.top && window.referWidget.top.doScroll ) {

		( function doScrollCheck() {

			if ( !window.referWidget.isReady ) {

				try {

					// Use the trick by Diego Perini
					// http://javascript.nwbox.com/IEContentLoaded/
					window.referWidget.top.doScroll( "left" );
				} catch ( e ) {
					return window.setTimeout( doScrollCheck, 50 );
				}

				// and execute any waiting functions
				window.referWidget.eventReady();
			}

		} )();

	}

}

// Add google places and algolia client libraries
// If its IE8/IE9 don't add the libraries.
// TODO: Find a cleaner way to check if its IE8/IE9. This is a function in the utils object
referWidget.myNav = navigator.userAgent.toLowerCase();
referWidget.isIE = (referWidget.myNav.indexOf('msie') != -1) ? parseInt(referWidget.myNav.split('msie')[1]) : false;
if(!referWidget.isIE || referWidget.isIE > 9){

	//referWidget.loadScript("https://maps.googleapis.com/maps/api/js?key=AIzaSyCTKbAMgDKSz2pqTovuM-cEe53pad8AZxY&libraries=places", referWidget.googleReady)
	// referWidget.loadScript("https://cdn.jsdelivr.net/algoliasearch/3/algoliasearch.min.js", referWidget.algoliaReady)
	//referWidget.loadScript("https://cdn.jsdelivr.net/autocomplete.js/0/autocomplete.min.js", referWidget.autocompleteReady)
	// window.referWidget.placesScript = document.createElement("script");
	// window.referWidget.placesScript.type = "text/javascript";
	// window.referWidget.placesScript.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyCTKbAMgDKSz2pqTovuM-cEe53pad8AZxY&libraries=places&callback=window.referWidget.googleReady";
	// document.body.appendChild(window.referWidget.placesScript);

	// window.referWidget.algoliaScript = document.createElement("script");
	// window.referWidget.algoliaScript.type = "text/javascript";
	// window.referWidget.algoliaScript.src = "https://cdn.jsdelivr.net/algoliasearch/3/algoliasearch.min.js?callback=window.referWidget.algoliaReady";
	// document.body.appendChild(window.referWidget.algoliaScript);

}else{
	// window.referWidget.googleReady();
}

