import ApiService from './ApiService';
import { ResponseObject } from './types';

export interface Election {
  _id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: 'ongoing' | 'completed';
  society_id: string;
  created_at: string;
}

export interface Candidate {
  _id: string;
  election_id: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  manifesto: string;
}

export interface ElectionDetails {
  election: Election;
  candidates: Candidate[];
}

export interface ElectionResult {
  candidate_name: string;
  votes: number;
}

class ElectionService {
  async createElection(data: Partial<Election>): Promise<ResponseObject<Election>> {
    return ApiService.request('post', '/elections', data);
  }

  async addCandidate(data: { election_id: string; user_id: string; manifesto: string }): Promise<ResponseObject<Candidate>> {
    return ApiService.request('post', '/elections/candidates', data);
  }

  async getElections(society_id: string): Promise<ResponseObject<Election[]>> {
    return ApiService.request('get', `/elections?society_id=${society_id}`);
  }

  async getElectionDetails(id: string): Promise<ResponseObject<ElectionDetails>> {
    return ApiService.request('get', `/elections/${id}`);
  }

  async castVote(election_id: string, candidate_id: string): Promise<ResponseObject<any>> {
    return ApiService.request('post', '/elections/vote', { election_id, candidate_id });
  }

  async getResults(id: string): Promise<ResponseObject<ElectionResult[]>> {
    return ApiService.request('get', `/elections/${id}/results`);
  }

  async updateStatus(id: string, status: 'ongoing' | 'completed'): Promise<ResponseObject<Election>> {
    return ApiService.request('patch', `/elections/${id}/status`, { status });
  }

  async updateUserRole(user_id: string, role: string): Promise<ResponseObject<any>> {
    return ApiService.request('patch', '/users/roles', { user_id, role });
  }
}

export default new ElectionService();
