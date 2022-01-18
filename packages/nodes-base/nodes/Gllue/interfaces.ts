export interface GllueEvent {
	date: string;
	info: string;
	sign: string;
}

export interface CandidateResponse {
	id: number;
	email: string;
}

export interface CvSentResponse {
	ids: number[];
	result: { candidate: CandidateResponse[] };
}
