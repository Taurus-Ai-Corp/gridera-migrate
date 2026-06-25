     1|module github.com/Taurus-Ai-Corp/gridera-migrate
     2|
     3|go 1.21
     4|
     5|require (
     6|	github.com/hashgraph/hedera-sdk-go v0.0.0
     7|	github.com/noblepostquantum/mlkem v0.0.0
     8|)
     9|
    10|replace github.com/hashgraph/hedera-sdk-go => ./hedera-sdk-stub
    11|replace github.com/noblepostquantum/mlkem => ./pqc-stub