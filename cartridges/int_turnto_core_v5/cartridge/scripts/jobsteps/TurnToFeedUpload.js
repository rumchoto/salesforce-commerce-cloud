'use strict';

/**
 * Copies files to a remote (S)FTP-Location
 *
 * Job Parameters:
 *
 *   ServiceID: String The service ID to use to connect to the remote server.
 *   PostFileLocation : String location to post file on the SFTP
 *   FilePattern : String regular Expression of Files to Upload
 *   NoFileFoundStatus: String The status to fire when no files are found in the local directory.
 *   IsDisabled : Boolean Mark the step as disabled. This will skip the step and returns a OK status
 */

var Site = require('dw/system/Site');
var File = require('dw/io/File');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

/*Script Modules*/
var TurnToHelper = require('*/cartridge/scripts/util/TurnToHelperUtil');
var FeedUploadService = require('~/cartridge/scripts/service/FeedUploadService');
var ServiceFactory = require('~/cartridge/scripts/util/ServiceFactory');

/**
 * @function
 * 
 * @name run
 * @description The main function.
 * @returns {dw.system.Status} The exit status for the job step
 */
var run = function run() {

	try {
		var args = arguments[0];

		if (args.IsDisabled) {
			return new Status(Status.OK, 'OK', 'Step disabled, skip it...');
		}

		// Load input Parameters
		var serviceID = args.ServiceID;
		var postFileLocation = args.PostFileLocation;
		var filePattern = args.FilePattern;
		var noFilesFoundStatus = args.NoFileFoundStatus;

		// Test mandatory parameters
		if (empty(serviceID) || empty(postFileLocation) || empty(filePattern)) {
			return new Status(Status.ERROR, 'ERROR', 'One or more mandatory parameters are missing. Service ID = (' + serviceID + ') Post File Location = (' + postFileLocation + ') FilePattern = (' + filePattern + ')');
		}

		// Get the file path where the output will be stored
		var impexPath = File.getRootDirectory(File.IMPEX).getFullPath();
		// Create a TurnTo directory if one doesn't already exist
		var turntoDir = new File(impexPath + File.SEPARATOR + "TurnTo");

		if (!turntoDir.exists()) {
			turntoDir.mkdirs();
		}

		// Retrieve HashMap of Keys which contain auth and site keys
		var siteAndAuthKeys = TurnToHelper.getHashMapOfKeys();

		//Loop through all allowed locales per site
		var allowedLocales = TurnToHelper.getAllowedLocales();
		for each(var locale in allowedLocales) {
			// List all files in the specific locale folder
			var exportFiles = new File(turntoDir.getFullPath() + File.SEPARATOR + locale);
			exportFiles = exportFiles.listFiles();

			// If no files are found, go to the next locale
			if(!exportFiles) {
				continue;
			}
			
			// filter out files which match the file pattern
			var filteredExportFiles = exportFiles.clone();
			for each(var file in exportFiles) {
				if(file.getName().match(filePattern) == null) {
					filteredExportFiles.remove(file);
					continue;
				} else {
					//Localized siteKey and authKey, need to download per locale, added to the content body of the service request
					for each(var obj in siteAndAuthKeys.entrySet()) {
						if(obj.value.locales.indexOf(locale) > -1) {
							var siteKey = JSON.parse(obj.key);
							var authKey = obj.value.authKey;
							var domain = 'www.' + obj.value.domain;
							break;
						}
					}
					
					//If turntoAuthKey and turntoSiteKey values are not defined for a particular locale the job should skip the locale.
					if(empty(siteKey) || empty(authKey) || empty(domain)) {
						Logger.error('FAILED Site and/or Auth key or domain is missing: Site Key -> ' + siteKey + ' Auth Key -> ' + authKey + ' Export File Name -> ' + file.name  + ' domain -> ' + domain);
						continue;
					}
					
					//feedUploadService
					var requestDataContainer = ServiceFactory.buildFeedUploadRequestContainer(postFileLocation, file, siteKey, authKey, domain);
					Logger.info('Post file location: ' + postFileLocation);
					Logger.info('Export file: ' + file);
					
					//call service, returns success or error
					Logger.error("FeedUploadService: " + JSON.stringify(FeedUploadService.getConfiguration()));
					Logger.error("FeedUploadService2: " + FeedUploadService.getRequestData());
					Logger.error("FeedUploadService2.1: " + FeedUploadService.configuration);
					var feedUploadResult = FeedUploadService.call(requestDataContainer);
					Logger.error("FeedUploadService3: " + FeedUploadService.getRequestData());
					Logger.error("FeedUploadService4: " + FeedUploadService.getResponse());

					if (feedUploadResult.error) { 
						Logger.error('Feed upload service error: ' + feedUploadResult.error + ' ' + feedUploadResult.errorMessage);
					}
				
					if (!feedUploadResult.isOk()) {
						Logger.error('requestDataContainer is something?: ' + JSON.stringify(requestDataContainer));
						Logger.error('requestDataContainer is something1?: ' + JSON.stringify(requestDataContainer.requestMethod));
						Logger.error('requestDataContainer is something1.5?: ' + JSON.stringify(requestDataContainer.path));
						Logger.error('requestDataContainer is something1.75?: ' + JSON.stringify(requestDataContainer.outfile));
						Logger.error('requestDataContainer is something2?: ' + JSON.stringify(requestDataContainer.args));
						for each (var arg in requestDataContainer.args) {
							if (arg.getName() == "file") {
								Logger.error('requestDataContainer is something3?: ' + arg.getName() + " = " + arg.getStringValue());
							} else {
								Logger.error('requestDataContainer is something3?: ' + arg.getName() + " = " + arg.getStringValue());
							}
						}
						Logger.error('Feed upload service is something?: ' + feedUploadResult.getMsg());
						Logger.error('Feed upload service is something 2?: ' + feedUploadResult.getStatus());
						Logger.error('Feed upload service is something 3?: ' + feedUploadResult.getErrorMessage());
						Logger.error('Feed upload service is something 4?: ' + feedUploadResult.toString());
						Logger.error('Feed upload service is not ok: ' + feedUploadResult.isOk());
						Logger.error('Feed upload service object: ' + JSON.stringify(feedUploadResult));
						return new Status(Status.ERROR, 'ERROR', 'FAILED uploading file with XML file name : ' + file.fullPath + '\nerror:' + feedUploadResult.errorMessage);
					} else {
						// Archive file
						var archiveFile = new File(turntoDir.fullPath + File.SEPARATOR + 'Archive');

						if (!archiveFile.exists()) {
							archiveFile.mkdirs();
						}
						var theArchiveFile = new File(archiveFile.fullPath + File.SEPARATOR + file.getName());
						file.renameTo(theArchiveFile);
					}
				}
			};

			if (filteredExportFiles.size() == 0) {
				switch (noFilesFoundStatus) {
				case 'ERROR':
					return new Status(Status.ERROR, 'ERROR', 'FAILED No files existed with file pattern: ' + filePattern);
				default:
					continue;
				}
			}
		}
	} catch (exception) {
		return new Status(Status.ERROR, 'ERROR', 'FAILED Upload failed with catch block. Error message: ' + exception.message);
	}
	return new Status(Status.OK, 'OK', 'Upload successful.');
};

exports.Run = run;
