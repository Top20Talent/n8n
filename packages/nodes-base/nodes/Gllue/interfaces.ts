export interface GllueEvent {
	date: string;
	info: string;
	sign: string;
}

export interface CandidateResponse {
	id: number;
	email: string;
}

export interface CvSentDetailResponse {
	id: number;
	gllueext_send_terms_cv_sent: string;
}

export interface CvSentResponse {
	ids: number[];
	result: {
		cvsent: CvSentDetailResponse[];
		candidate: CandidateResponse[]
	};
}

interface Consent {
	id: string;
}

export interface Consents {
	consents: Consent[];
}
