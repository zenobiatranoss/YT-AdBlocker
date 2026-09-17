package filtering

type Response struct {
	Status  int
	Headers map[string]string
	Body    []byte
}

type ResponseDecision struct {
	Blocked bool
	Reason  string
}
