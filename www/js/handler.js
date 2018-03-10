var Controller = function() {
    var controller = {
		
        myMedia : null, 
		isPlaying: false,
		self: null,
		listenersInterval: null,
		mediaConfig:{
			url:'http://stream.esiliati.org:8000/radiogramma.ogg',
			server_name:'RadiogrAMma',
			json_url:'http://stream.esiliati.org:8000/status-json.xsl',
			stats: null,
			req_interval: 30000
		},
		
        initialize: function() {
            self = this;
        	document.getElementById('playpause').addEventListener('click', this.onPlayPausePress,false);
			this.isStreamAvailable(()=>{
				document.getElementById('debug').innerHTML='Streaming available!';
				self.mediaInit();
			},
			(e)=>{
				document.getElementById('debug').innerHTML='Streaming error: '+e;
			});
        },
		
		shutdown: function(){
			if (self.Mymedia) {
				MusicControls.destroy(()=>{console.log('MusicControls: Shutdown');}, (e)=>{console.log('MusicControls Error:' +e);});
				self.isPlaying=false;
				self.myMedia.release();
			}
			navigator.app.exitApp();
		},

		onPlayPausePress: function() {
			if(!self.isPlaying){
				self.myMedia.play();
			}else{
				self.myMedia.pause();
			}
		},
		
		mediaStatusListener: function(stato){
			switch(stato){
				case 1: //Starting
					document.getElementById('debug').innerHTML='Connecting';
					document.getElementById('playpause').classList.add('disabled');
					break;
				case 2: //playing
					document.getElementById('debug').innerHTML='Playing';
					document.getElementById('playpause').classList.remove('disabled');
					document.getElementById('playpause').classList.add('active');
					MusicControls.updateIsPlaying(true);
					MusicControls.updateDismissable(false);
					self.isPlaying=true;
					self.startListenerUpdater();
					break;
				case 3: //paused
					document.getElementById('debug').innerHTML='Paused';
					self.isPlaying=false;
					document.getElementById('playpause').classList.remove('active');
					MusicControls.updateIsPlaying(false);
					MusicControls.updateDismissable(true);
					self.stopListenerUpdater();
					break;
				case 4:
					document.getElementById('debug').innerHTML='Stopped';
					document.getElementById('playpause').classList.remove('active');
					document.getElementById('playpause').classList.add('disabled');
					MusicControls.updateIsPlaying(false);
					MusicControls.updateDismissable(true);	
					break;
				default:
					console.log('weired status code' + stato);
					break;
			}
		},
		
		mediaInit: function() {
			// self.myMedia = new Media('http://78.46.73.91:9111/stream.mp3',
			self.myMedia = new Media(self.mediaConfig.url,
				// success callback
				() => {
					document.getElementById('debug').innerHTML='Media: closed';
					if(self.isPlaying){self.shutdown();}
				},
				// error callback
				(err) => {
					document.getElementById('debug').innerHTML='Media error: '+err.code;
					document.getElementById('playpause').classList.remove('active');
					document.getElementById('playpause').classList.add('disabled');
					MusicControls.destroy(()=>{console.log('MusicControls: Shutdown');}, (e)=>{console.log('MusicControls Error:' +e);});
				},
				(stat)=>{self.mediaStatusListener(stat)}
			);
			document.getElementById('playpause').classList.remove('disabled');
			MusicControls.create({
				track       : 'RadiogrAMma',		// optional, default : ''
				artist      : '',						// optional, default : ''
				cover       : 'img/icon.png',		// optional, default : nothing
				// cover can be a local path (use fullpath 'file:///storage/emulated/...', or only 'my_image.jpg' if my_image.jpg is in the www folder of your app)
				//			 or a remote url ('http://...', 'https://...', 'ftp://...')
				isPlaying   : false,							// optional, default : true
				dismissable : true,							// optional, default : false

				// hide previous/next/close buttons:
				hasPrev   : false,		// show previous button, optional, default: true
				hasNext   : false,		// show next button, optional, default: true
				hasClose  : false,		// show close button, optional, default: false

				// iOS only, optional
				
				// Android only, optional
				// text displayed in the status bar when the notification (and the ticker) are updated
				ticker	  : 'RadiogrAMma',
				
				}, 
				()=>{
					MusicControls.subscribe(self.musicControlsEventListener);
					MusicControls.listen();
				},
				(e)=> {console.log('MusicControls error '+e)}
			);
		},
		
		musicControlsEventListener: function(action){
			const message = JSON.parse(action).message;
			switch(message) {
			
				case 'music-controls-pause':
					self.myMedia.pause();
					break;
				case 'music-controls-play':
					self.myMedia.play();
					break;
				case 'music-controls-destroy':
					self.shutdown()
					break;
				// Headset events (Android only)
				case 'music-controls-headset-unplugged':
					if(self.isPlaying){self.myMedia.pause();};
					break;
				default:
					break;
			}
			
		},
		
		isStreamAvailable: function(successCallback, failureCallback){
			var request = new XMLHttpRequest();
			request.open('GET', self.mediaConfig.json_url, true);

			request.onload = function() {
			  if (request.status >= 200 && request.status < 400) {
				// Success!
				var data = JSON.parse(request.responseText);
				
				if (typeof data.icestats.source == 'object'){
					if(data.icestats.source.server_name==self.mediaConfig.server_name){
						self.mediaConfig.stats=data.icestats.source;
						successCallback();
					}else{
						failureCallback('RADIO_OFFLINE');
					}
				}
				else if (typeof data.icestats.source == 'array'){
					if(typeof data.icestats.source.find((a)=>{return a.server_name==self.mediaConfig.server_name}) != 'undefined' ){
						self.mediaConfig.stats=data.icestats.source.find((a)=>{return a.server_name==self.mediaConfig.server_name});
						successCallback();
					}else{
						failureCallback('RADIO_OFFLINE');
					}
				} else if (typeof data.icestats.source){
					failureCallback('RADIO_OFFLINE');
				}
				
			  } else {
					failureCallback('SERVER_ERROR');
			  }
			};

			request.onerror = function(a) {
				failureCallback('CONNECTION_ERROR');
			};

			request.send();
		},
		
		updateMediaStats: function(){
			var request = new XMLHttpRequest();
			request.open('GET', self.mediaConfig.json_url, true);

			request.onload = function() {
			  if (request.status >= 200 && request.status < 400) {
				// Success!
				var data = JSON.parse(request.responseText);
				
				if (typeof data.icestats.source == 'object'){
					if(data.icestats.source.server_name==self.mediaConfig.server_name){
						self.mediaConfig.stats=data.icestats.source;
						document.getElementById('listeners').innerHTML='Online: '+self.mediaConfig.stats.listeners+' Max: '+self.mediaConfig.stats.listener_peak;
					}else{
						document.getElementById('listeners').innerHTML=' &nbsp ';
						document.getElementById('debug').innerHTML='Streaming error: RADIO_OFFLINE';
					}
				}
				else if (typeof data.icestats.source == 'array'){
					if(typeof data.icestats.source.find((a)=>{return a.server_name==self.mediaConfig.server_name}) != 'undefined' ){
						self.mediaConfig.stats=data.icestats.source.find((a)=>{return a.server_name==self.mediaConfig.server_name});
						document.getElementById('listeners').innerHTML='Online: '+self.mediaConfig.stats.listeners+' Max: '+self.mediaConfig.stats.listener_peak;
					}else{
						document.getElementById('listeners').innerHTML=' &nbsp ';
						document.getElementById('debug').innerHTML='Streaming error: RADIO_OFFLINE';
					}
				} else if (typeof data.icestats.source){
					document.getElementById('listeners').innerHTML=' &nbsp ';
					document.getElementById('debug').innerHTML='Streaming error: RADIO_OFFLINE';
				}
				
			  } else {
					document.getElementById('listeners').innerHTML=' &nbsp ';
					document.getElementById('debug').innerHTML='Streaming error: SERVER_ERROR';
			  }
			};

			request.onerror = function(a) {
				document.getElementById('listeners').innerHTML=' &nbsp ';
				document.getElementById('debug').innerHTML='Streaming error: CONNECTION_ERROR';
			};

			request.send();
		},
		
		startListenerUpdater: function(){
			self.updateMediaStats();
			self.listenersInterval = setInterval(self.updateMediaStats,self.mediaConfig.req_interval);
		},
		stopListenerUpdater: function(){
			clearInterval(self.listenersInterval);
		}
		
    }
    return controller;
}

