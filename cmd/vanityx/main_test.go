package main

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"testing"

	vs "github.com/liumingxun/vanityx/pkg/search"
	e "github.com/luxfi/geth/common"
)

var (
	testDeployer     = e.HexToAddress("0x4e59b44847b379578588920ca78fbf26c0b4956c")
	testInitcodeHash = e.HexToHash("0x00")
)

func TestSearchWorkers(t *testing.T) {
	for _, workers := range []int{1, 4} {
		t.Run(fmt.Sprintf("workers=%d", workers), func(t *testing.T) {
			config := &vs.Config{
				Pattern:      "0x0*",
				Deployer:     testDeployer,
				InitcodeHash: testInitcodeHash,
			}
			pair, err := search(t.Context(), config, workers)
			if err != nil {
				t.Fatalf("search: %v", err)
			}
			if pair == nil {
				t.Fatal("search returned no pair")
			}
			if !strings.HasPrefix(strings.ToLower(pair.Address()), "0x0") {
				t.Fatalf("address %s does not match pattern %s", pair.Address(), config.Pattern)
			}

			salt := decodeSalt(t, pair.Salt())
			if got := e.CreateAddress2(config.Deployer, salt, config.InitcodeHash.Bytes()); got.Hex() != pair.Address() {
				t.Fatalf("salt %s derives %s, want %s", pair.Salt(), got.Hex(), pair.Address())
			}
		})
	}
}

func TestSearchWorkersInvalidPattern(t *testing.T) {
	pair, err := search(t.Context(), &vs.Config{
		Pattern:      "0xzz*",
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	}, 4)
	if !errors.Is(err, vs.ErrInvalidPattern) {
		t.Fatalf("got %v, want ErrInvalidPattern", err)
	}
	if pair != nil {
		t.Fatalf("got pair %+v, want nil", pair)
	}
}

func TestSearchWorkersContextCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	pair, err := search(ctx, &vs.Config{
		Pattern:      "0xdeadbeef",
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	}, 4)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("got %v, want context.Canceled", err)
	}
	if pair != nil {
		t.Fatalf("got pair %+v, want nil", pair)
	}
}

func decodeSalt(t *testing.T, s string) [32]byte {
	t.Helper()

	decoded, err := hex.DecodeString(s)
	if err != nil {
		t.Fatalf("decode salt %q: %v", s, err)
	}
	if len(decoded) != e.HashLength {
		t.Fatalf("salt %q has %d bytes, want %d", s, len(decoded), e.HashLength)
	}

	var salt [32]byte
	copy(salt[:], decoded)
	return salt
}
