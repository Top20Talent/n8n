export interface GllueEvent {
	date: string;
	info: string;
	sign: string;
}

export interface N8nGllueEvent {
	date: string;
	info: {
		trigger_model_name: string,
		trigger_model_id: number,
		trigger_mode: string,
		trigger_field: string,
		trigger_time: string,
	};
	sign: string;
}
