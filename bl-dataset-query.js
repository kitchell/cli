#!/usr/bin/env node

const request = require('request');
const argv = require('minimist')(process.argv.slice(2));
const config = require('./config');
const fs = require('fs');
const async = require('async');
const spawn = require('child_process').spawn;
//const WebSocketClient = require('websocket').client;
const jsonwebtoken = require('jsonwebtoken');
const commander = require('commander');
const chalk = require('chalk');
const util = require('./util');
const timeago = require('time-ago');

commander
    .option('--search <search>', 'filter datasets by name or id')
    .option('--datatype <datatype>', 'filter datasets by datatype')
    .option('--project <projectid>', 'filter datasets by project id')
    .option('--subject <subject>', 'filter datasets by subject')
    .option('--raw', 'output data in raw format (JSON)')
    .parse(process.argv);

util.loadJwt().then(jwt => {
    let headers = { "Authorization": "Bearer " + jwt };
    let datatypeTable = {};
    
    util.queryDatasets(headers, commander.search, commander.datatype, commander.project, commander.subject)
    .then(datasets => {
        if (commander.raw) console.log(JSON.stringify(datasets));
        else formatDatasets(headers, datasets, { all: true }).then(console.log);
    }).catch(console.error);
}).catch(console.error);

/**
 * Format dataset information
 * @param {dataset[]} data
 * @param {Object} whatToShow
 * @returns {Promise<string>}
 */
function formatDatasets(headers, data, whatToShow) {
    let projectTable = {}, datatypeTable = {}, profileTable = {};
    return new Promise((resolve, reject) => {
        util.queryProjects(headers)
        .then(projects => {
            projects.forEach(project => projectTable[project._id] = project);
            return util.queryProfiles(headers);
        }).then(_profiles => {
            _profiles.forEach(profile => profileTable[profile.id] = profile);
            return util.queryDatatypes(headers);
        }).then(datatypes => {
            datatypes.forEach(datatype => datatypeTable[datatype._id] = datatype);
            let resultArray = data.map(d => {
                let info = [];
                let createDateObject = new Date(d.create_date);
                let formattedDate = createDateObject.toLocaleString() + " (" + timeago.ago(createDateObject) + ")";
                let subject = d.meta && d.meta.subject ? d.meta.subject : 'N/A';
                let formattedDatatype = datatypeTable[d.datatype].name;
                let formattedDatatypeTags = d.datatype_tags.length == 0 ? '' : "<" + d.datatype_tags.join(', ') + ">";
                
                let formattedProject = 'Unknown', formattedAdmins = [], formattedMembers = [], formattedGuests = [];
                if (projectTable[d.project]) {
                    formattedProject = projectTable[d.project].name;
                    
                    if (projectTable[d.project].admins) formattedAdmins = projectTable[d.project].admins.map(s => profileTable[s] ? profileTable[s].username : 'unknown');
                    if (projectTable[d.project].members) formattedMembers = projectTable[d.project].members.map(s => profileTable[s] ? profileTable[s].username : 'unknown');
                    if (projectTable[d.project].guests) formattedGuests = projectTable[d.project].guests.map(s => profileTable[s] ? profileTable[s].username : 'unknown');
                }
                
                if (whatToShow.all || whatToShow.id) info.push("Id: " + d._id);
                if (whatToShow.all || whatToShow.project) info.push("Project: " + formattedProject);
                if (whatToShow.all || whatToShow.project) info.push("Admins: " + formattedAdmins.join(', '));
                if (whatToShow.all || whatToShow.project) info.push("Members: " + formattedMembers.join(', '));
                if (whatToShow.all || whatToShow.project) info.push("Guests: " + formattedGuests.join(', '));
                if (whatToShow.all || whatToShow.subject) info.push("Subject: " + subject);
                if (whatToShow.all || whatToShow.subject) info.push("Session: " + (d.meta ? (d.meta.session || "") : ""));
                if (whatToShow.all || whatToShow.datatype) info.push("Datatype: " + formattedDatatype + formattedDatatypeTags);
                if (whatToShow.all || whatToShow.desc) info.push("Description: " + (d.desc||''));
                if (whatToShow.all || whatToShow.create_date) info.push("Create Date: " + formattedDate);
                if (whatToShow.all || whatToShow.storage) info.push("Storage: " + d.storage);
                if (whatToShow.all || whatToShow.status) info.push("Status: " + d.status);
                // if (whatToShow.all || whatToShow.meta) info.push("Meta: " + formattedMeta);

                return info.join('\n');
            });
            
            resultArray.push("(Returned " + data.length + " " + util.pluralize("result", data) + ")");
            resolve(resultArray.join('\n\n'));

        }).catch(console.error);
    });
}