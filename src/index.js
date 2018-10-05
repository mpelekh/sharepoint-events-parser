module.exports = {
	parseEvents(events, start, end) {
		let full = [];
		for (let i = 0; i < events.length; i++) {
			full = full.concat(this.parseEvent(events[i], start, end));
		}
		return full;
	},

	formatString(str) {
		let arr = str.split("'");
		str = arr.join('');
		arr = str.split('"');
		str = arr.join('');
		arr = str.split('=');
		str = arr.join(' ');
		str.trim();
		return str.split(' ');
	},
	parseDate(date, allDay) {
		if (typeof date == 'string') {
			if (allDay) {
				if (date.lastIndexOf('Z') == date.length - 1) {
					const dt = date.substring(0, date.length - 1);
					return new Date(dt);
				}
			} else {
				return new Date(date);
			}
		}
		return date;
	},
	parseEvent(e, start, end) {
		if (!e.fRecurrence) {
			e.EventDate = new Date(this.parseDate(e.EventDate, e.fAllDayEvent));
			e.EndDate = new Date(this.parseDate(e.EndDate, e.fAllDayEvent));
            return (start && end)
                ? (new Date(start) <= e.EventDate && new Date(end) >= e.EndDate) ? [e] : []
                : [e];
		} else {
			start = start || this.parseDate(e.EventDate, e.fAllDayEvent);
			end = end || this.parseDate(e.EndDate, e.fAllDayEvent);
			const er = [];
			const wd = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
			const wom = ['first', 'second', 'third', 'fourth'];
			let rTotal = 0;
            let total = 0;
            let [_, windowEnd] = /<windowEnd>(.+)<\/windowEnd>/.exec(e.RecurrenceData) || [];
            if (windowEnd && (new Date(windowEnd) <= new Date())) {
                return [];
            }
			if (e.RecurrenceData.includes('<repeatInstances>')) {
				rTotal = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<repeatInstances>') + 17);
				rTotal = parseInt(rTotal.substring(0, rTotal.indexOf('<')));
			}
			if (e.RecurrenceData.includes('<daily ')) {
				var str = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<daily '));
				str = str.substring(7, str.indexOf('/>') - 1);
				var arr = this.formatString(str);
				if (arr.includes('dayFrequency')) {
					var frequency = parseInt(arr[arr.indexOf('dayFrequency') + 1]);
					var loop = true;
					var init = this.parseDate(e.EventDate, e.fAllDayEvent);
					while (loop) {
						total++;
						if (new Date(init).getTime() >= start.getTime()) {
							var ed = new Date(init);
							ed.setSeconds(ed.getSeconds() + e.Duration);
							var ni = this.cloneObj(e);
							ni.EventDate = new Date(init);
							ni.EndDate = ed;
							ni.fRecurrence = false;
							ni.Id = e.Id;
							ni.ID = ni.Id;
							er.push(ni);
						}
						init.setDate(init.getDate() + frequency);
						if (new Date(init) > end || (rTotal > 0 && rTotal <= total)) loop = false;
					}
				} else if (arr.includes('weekday')) {
					e.RecurrenceData = `${e.RecurrenceData}<weekly mo='TRUE' tu='TRUE' we='TRUE' th='TRUE' fr='TRUE' weekFrequency='1' />`; //change from daily on every weekday to weekly on every weekday
				}
			}
			if (e.RecurrenceData.includes('<weekly ')) {
				var str = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<weekly '));
				str = str.substring(8, str.indexOf('/>') - 1);
				var arr = this.formatString(str);
				var frequency = parseInt(arr[arr.indexOf('weekFrequency') + 1]);
				var loop = true;
				var init = this.parseDate(e.EventDate, e.fAllDayEvent);
				let initDay = init.getDay();
				while (loop) {
					for (var i = initDay; i < 7; i++) {
						if (arr.includes(wd[i]) && (rTotal > total || rTotal == 0)) {
							total++;
							if (new Date(init).getTime() >= start.getTime()) {
								var nd = new Date(init);
								nd.setDate(nd.getDate() + (i - initDay));
								var ed = new Date(nd);
								ed.setSeconds(ed.getSeconds() + e.Duration);
								var ni = this.cloneObj(e);
								ni.EventDate = new Date(nd);
								ni.EndDate = ed;
								ni.fRecurrence = false;
								ni.Id = e.Id;
								ni.ID = ni.Id;
								er.push(ni);
							}
						}
					}
					init.setDate(init.getDate() + (7 * frequency - initDay));
					initDay = 0;
					if (new Date(init) > end || (rTotal > 0 && rTotal <= total)) loop = false;
				}
			}
			if (e.RecurrenceData.includes('<monthly ')) {
				var str = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<monthly '));
				str = str.substring(9, str.indexOf('/>') - 1);
				var arr = this.formatString(str);
				var frequency = parseInt(arr[arr.indexOf('monthFrequency') + 1]);
				var loop = true;
				var init = this.parseDate(e.EventDate, e.fAllDayEvent);
				var day = parseInt(arr[arr.indexOf('day') + 1]);
				while (loop) {
					total++;
					if (new Date(init).getTime() >= start.getTime()) {
						var nd = new Date(init);
						nd.setDate(day);
						if (nd.getMonth() == init.getMonth()) {
							var ed = new Date(nd);
							ed.setSeconds(ed.getSeconds() + e.Duration);
							var ni = this.cloneObj(e);
							ni.EventDate = new Date(nd);
							ni.EndDate = ed;
							ni.fRecurrence = false;
							ni.Id = e.Id;
							ni.ID = ni.Id;
							er.push(ni);
						}
					}
					init.setMonth(init.getMonth() + frequency);
					if (new Date(init) > end || (rTotal > 0 && rTotal <= total)) loop = false;
				}
			}
			if (e.RecurrenceData.includes('<monthlyByDay ')) {
				var str = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<monthlyByDay '));
				str = str.substring(14, str.indexOf('/>') - 1);
				var arr = this.formatString(str);
				var frequency = parseInt(arr[arr.indexOf('monthFrequency') + 1]);
				var loop = true;
				var init = this.parseDate(e.EventDate, e.fAllDayEvent);
				var weekdayOfMonth = arr[arr.indexOf('weekdayOfMonth') + 1];
				var temp = new Date();
				while (loop) {
					total++;
					if (new Date(init).getTime() >= start.getTime()) {
						var nd = new Date(init);
						nd.setDate(1); //set to first day of month
						if (arr.includes('weekday')) {
							//find first weekday - if not saturday or sunday, then current date is a weekday
							if (nd.getDay() == 0) nd.setDate(nd.getDate() + 1);
							//add one day to sunday
							else if (nd.getDay() == 6) nd.setDate(nd.getDate() + 2); //add two days to saturday
							if (weekdayOfMonth == 'last') {
								while (nd.getMonth() == init.getMonth()) {
									temp = new Date(nd);
									if (nd.getDay() == 5) nd.setDate(nd.getDate() + 3);
									//if the current date is friday, add three days to get to monday
									else nd.setDate(nd.getDate() + 1); //otherwise, just add one day
								}
								nd = new Date(temp);
							} else {
								for (var i = 0; i < wom.indexOf(weekdayOfMonth); i++) {
									if (nd.getDay() == 5) nd.setDate(nd.getDate() + 3);
									//if the current date is friday, add three days to get to monday
									else nd.setDate(nd.getDate() + 1); //otherwise, just add one day
								}
							}
						} else if (arr.includes('weekend_day')) {
							//find first weekend day
							if (nd.getDay() != 0 && nd.getDay() != 6) nd.setDate(nd.getDate() + (6 - nd.getDay())); //if not saturday or sunday, then add days to get to saturday
							if (weekdayOfMonth == 'last') {
								while (nd.getMonth() == init.getMonth()) {
									temp = new Date(nd);
									if (nd.getDay() == 0) nd.setDate(nd.getDate() + 6);
									//if the current date is sunday, add six days to get to saturday
									else nd.setDate(nd.getDate() + 1); //otherwise, just add one day
								}
								nd = new Date(temp);
							} else {
								for (var i = 0; i < wom.indexOf(weekdayOfMonth); i++) {
									if (nd.getDay() == 0) nd.setDate(nd.getDate() + 6);
									//if the current date is sunday, add six days to get to saturday
									else nd.setDate(nd.getDate() + 1); //otherwise, just add one day
								}
							}
						} else if (arr.includes('day')) {
							//just looking for the Nth day in the month...
							if (weekdayOfMonth == 'last') {
								var nd = nd.setMonth(nd.getMonth() + 1);
								nd.setDate(0);
							} else nd.setDate(nd.getDate() + wom.indexOf(weekdayOfMonth)); //now add days to get to the Nth instance of this day
						} else {
							for (var i = 0; i < wd.length; i++) {
								//get first instance of the specified day
								if (arr.includes(wd[i])) {
									if (nd.getDate() > i) nd.setDate(nd.getDate() + (7 - (nd.getDay() - i)));
									else nd.setDate(nd.getDate() + (i - nd.getDay()));
								}
							}
							if (weekdayOfMonth == 'last') {
								while (nd.getMonth() == init.getMonth()) {
									temp = new Date(nd);
									nd.setDate(nd.getDate() + 7); //add a week to each instance to get the Nth instance
								}
								nd = new Date(temp);
							} else {
								for (var i = 0; i < wom.indexOf(weekdayOfMonth); i++) {
									nd.setDate(nd.getDate() + 7); //add a week to each instance to get the Nth instance
								}
							}
						}
						if (nd.getMonth() == init.getMonth()) {
							//make sure the new date calculated actually falls within the current month (sometimes there may be no 4th instance of a day)
							var ed = new Date(nd);
							ed.setSeconds(ed.getSeconds() + e.Duration);
							var ni = this.cloneObj(e);
							ni.EventDate = new Date(nd);
							ni.EndDate = ed;
							ni.fRecurrence = false;
							ni.Id = e.Id;
							ni.ID = ni.Id;
							er.push(ni);
						}
					}
					init.setMonth(init.getMonth() + frequency);
					if (new Date(init) > end || (rTotal > 0 && rTotal <= total)) loop = false;
				}
			}
			if (e.RecurrenceData.includes('<yearly ')) {
				var str = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<yearly '));
				str = str.substring(8, str.indexOf('/>') - 1);
				var arr = this.formatString(str);
				var frequency = parseInt(arr[arr.indexOf('yearFrequency') + 1]);
				var loop = true;
				var init = this.parseDate(e.EventDate, e.fAllDayEvent);
				var month = parseInt(arr[arr.indexOf('month') + 1]) - 1;
				var day = parseInt(arr[arr.indexOf('day') + 1]);
				while (loop) {
					var nd = new Date(init);
					nd.setMonth(month);
					nd.setDate(day);
					if (new Date(init).getTime() <= nd.getTime()) {
						total++;
						if (new Date(init).getTime() >= start.getTime()) {
							var ed = new Date(nd);
							ed.setSeconds(ed.getSeconds() + e.Duration);
							var ni = this.cloneObj(e);
							ni.EventDate = new Date(nd);
							ni.EndDate = ed;
							ni.fRecurrence = false;
							ni.Id = e.Id;
							ni.ID = ni.Id;
							er.push(ni);
						}
					}
					init.setFullYear(init.getFullYear() + frequency);
					if (new Date(init) > end || (rTotal > 0 && rTotal <= total)) loop = false;
				}
			}
			if (e.RecurrenceData.includes('<yearlyByDay ')) {
				var str = e.RecurrenceData.substring(e.RecurrenceData.indexOf('<yearlyByDay '));
				str = str.substring(13, str.indexOf('/>') - 1);
				var arr = this.formatString(str);
				var frequency = parseInt(arr[arr.indexOf('yearFrequency') + 1]);
				var loop = true;
				var init = this.parseDate(e.EventDate, e.fAllDayEvent);
				var month = parseInt(arr[arr.indexOf('month') + 1]) - 1;
				var weekdayOfMonth = arr[arr.indexOf('weekdayOfMonth') + 1];
				var day = 0;
				for (var i = 0; i < wd.length; i++) {
					if (arr.includes(wd[i])) {
						if (arr[arr.indexOf(wd[i]) + 1].toLowerCase() == 'true') day = i;
					}
				}
				while (loop) {
					var nd = new Date(init);
					nd.setMonth(month);
					if (new Date(init).getTime() <= nd.getTime()) {
						total++;
						if (new Date(init).getTime() >= start.getTime()) {
							nd.setDate(1);
							const dayOfMonth = nd.getDay();
							if (day < dayOfMonth) nd.setDate(nd.getDate() + (7 - dayOfMonth + day));
							//first instance of this day in the selected month
							else nd.setDate(nd.getDate() + (day - dayOfMonth));
							if (weekdayOfMonth == 'last') {
								var temp = new Date(nd);
								while (temp.getMonth() == month) {
									nd = new Date(temp);
									temp.setDate(temp.getDate() + 7); //loop from first instance of month to last instance of month
								}
							} else {
								nd.setDate(nd.getDate() + 7 * wom.indexOf(weekdayOfMonth));
							}
							if (nd.getMonth() == month) {
								var ed = new Date(nd);
								ed.setSeconds(ed.getSeconds() + e.Duration);
								var ni = this.cloneObj(e);
								ni.EventDate = new Date(nd);
								ni.EndDate = ed;
								ni.fRecurrence = false;
								ni.Id = e.Id;
								ni.ID = ni.Id;
								er.push(ni);
							}
						}
					}
					init.setFullYear(init.getFullYear() + frequency);
					init.setMonth(month);
					init.setDate(1);
					if (new Date(init) > end || (rTotal > 0 && rTotal <= total)) loop = false;
				}
			}
			return er;
		} //end recurrence check
	},
	cloneObj(obj) {
		let copy;
		if (null == obj || 'object' != typeof obj) return obj;
		if (obj instanceof Date) {
			copy = new Date();
			copy.setTime(obj.getTime());
			return copy;
		}
		if (obj instanceof Array) {
			copy = [];
			for (let i = 0, len = obj.length; i < len; i++) {
				copy[i] = this.cloneObj(obj[i]);
			}
			return copy;
		}
		if (obj instanceof Object) {
			copy = {};
			for (const attr in obj) {
				if (obj.hasOwnProperty(attr)) copy[attr] = this.cloneObj(obj[attr]);
			}
			return copy;
		}
		throw new Error("Unable to copy obj! Its type isn't supported.");
	}
};
