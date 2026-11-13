package search

import (
	"context"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"math"
	"strings"
	"testing"
	"time"

	e "github.com/luxfi/geth/common"
)

var (
	testDeployer     = e.HexToAddress("0x4e59b44847b379578588920ca78fbf26c0b4956c")
	testInitcodeHash = e.HexToHash("0x00")
	testAddress      = e.HexToAddress("0xdeadbeef00000000000000000000000000000000")
)

func TestNewMatcher(t *testing.T) {
	full := "deadbeef" + strings.Repeat("0", 32)

	tests := []struct {
		pattern string
		want    bool
		wantErr bool
	}{
		{"", true, false},
		{"0x", true, false},
		{"*", true, false},
		{"0xdead", true, false},
		{"dead", true, false},
		{"0xdead*", true, false},
		{"*0000", true, false},
		{"*000", true, false},
		{"*beef", false, false},
		{"*beef*", true, false},
		{"0x*beef*", true, false},
		{"*ffff*", false, false},
		{full, true, false},
		{full[:39], true, false},
		{"eadbeef*", false, false},
		{" 0xDEAD* ", true, false},
		{"?eadbeef*", true, false},
		{"0x[d]eadbeef*", true, false},
		{"0xzz*", false, true},
		{"0x[", false, true},
		{full + "0", false, true},
	}

	for _, tt := range tests {
		t.Run(tt.pattern, func(t *testing.T) {
			m, err := newMatcher(tt.pattern)
			if tt.wantErr {
				if !errors.Is(err, ErrInvalidPattern) {
					t.Fatalf("newMatcher(%q) error = %v, want ErrInvalidPattern", tt.pattern, err)
				}
				if m != nil {
					t.Fatalf("newMatcher(%q) returned a matcher alongside an error", tt.pattern)
				}
				return
			}
			if err != nil {
				t.Fatalf("newMatcher(%q): unexpected error: %v", tt.pattern, err)
			}
			if got := m(testAddress); got != tt.want {
				t.Errorf("newMatcher(%q)(%s) = %v, want %v", tt.pattern, testAddress.Hex(), got, tt.want)
			}
		})
	}
}

func TestAddressHasherMatchesCreateAddress2(t *testing.T) {
	var salt [32]byte
	for i := range salt[:24] {
		salt[i] = byte(i * 7)
	}
	initcodeHash := testInitcodeHash.Bytes()
	hasher := newAddressHasher(testDeployer, initcodeHash, salt[:24])

	for _, nonce := range []uint64{0, 1, 2, 1<<32 + 7, math.MaxUint64} {
		binary.BigEndian.PutUint64(salt[24:], nonce)
		want := e.CreateAddress2(testDeployer, salt, initcodeHash)
		if got := hasher.address(nonce); got != want {
			t.Errorf("nonce %d: address = %s, want %s", nonce, got.Hex(), want.Hex())
		}
		if got := hasher.salt(nonce); got != salt {
			t.Errorf("nonce %d: salt = %x, want %x", nonce, got, salt)
		}
	}
}

func TestSearchVanityPrefix(t *testing.T) {
	config := Config{
		Pattern:      "0x0*",
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	}
	pair, err := SearchVanity(t.Context(), &config)
	if err != nil {
		t.Fatalf("SearchVanity: %v", err)
	}
	if !strings.HasPrefix(strings.ToLower(pair.Address()), "0x0") {
		t.Fatalf("address %s does not match pattern %s", pair.Address(), config.Pattern)
	}

	salt := decodeSalt(t, pair.Salt())
	if got := e.CreateAddress2(config.Deployer, salt, config.InitcodeHash.Bytes()); got.Hex() != pair.Address() {
		t.Fatalf("salt %s derives %s, want %s", pair.Salt(), got.Hex(), pair.Address())
	}
}

func TestSearchVanitySuffix(t *testing.T) {
	config := Config{
		Pattern:      "*0",
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	}
	pair, err := SearchVanity(t.Context(), &config)
	if err != nil {
		t.Fatalf("SearchVanity: %v", err)
	}
	if !strings.HasSuffix(strings.ToLower(pair.Address()), "0") {
		t.Fatalf("address %s does not match pattern %s", pair.Address(), config.Pattern)
	}
}

func TestSearchVanityGlob(t *testing.T) {
	config := Config{
		Pattern:      "*abc*",
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	}
	pair, err := SearchVanity(t.Context(), &config)
	if err != nil {
		t.Fatalf("SearchVanity: %v", err)
	}
	if !strings.Contains(strings.ToLower(pair.Address()), "abc") {
		t.Fatalf("address %s does not match pattern %s", pair.Address(), config.Pattern)
	}
}

func TestSearchVanityInvalidPattern(t *testing.T) {
	patterns := []string{
		"0xzz*",
		"0x[",
		strings.Repeat("a", 2*e.AddressLength+1),
	}

	for _, pattern := range patterns {
		t.Run(pattern, func(t *testing.T) {
			pair, err := SearchVanity(t.Context(), &Config{
				Pattern:      pattern,
				Deployer:     testDeployer,
				InitcodeHash: testInitcodeHash,
			})
			if !errors.Is(err, ErrInvalidPattern) {
				t.Fatalf("SearchVanity(%q) error = %v, want ErrInvalidPattern", pattern, err)
			}
			if pair != nil {
				t.Fatalf("SearchVanity(%q) returned %+v alongside an error", pattern, pair)
			}
		})
	}
}

func TestSearchVanityContextCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	pair, err := SearchVanity(ctx, &Config{
		Pattern:      "0xdeadbeef",
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("got %v, want context.Canceled", err)
	}
	if pair != nil {
		t.Fatalf("got pair %+v, want nil", pair)
	}
}

func TestSearchVanityContextDeadline(t *testing.T) {
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Millisecond)
	defer cancel()

	pair, err := SearchVanity(ctx, &Config{
		// A full 40-nibble pattern is practically impossible to hit, so the
		// search can only stop because the context expires.
		Pattern:      strings.Repeat("deadbeef", 5),
		Deployer:     testDeployer,
		InitcodeHash: testInitcodeHash,
	})
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("got %v, want context.DeadlineExceeded", err)
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

func BenchmarkCreateAddress2(b *testing.B) {
	var salt [32]byte
	initcodeHash := testInitcodeHash.Bytes()
	b.ReportAllocs()
	for i := 0; b.Loop(); i++ {
		binary.BigEndian.PutUint64(salt[24:], uint64(i))
		_ = e.CreateAddress2(testDeployer, salt, initcodeHash)
	}
}

func BenchmarkAddressHasher(b *testing.B) {
	var salt [32]byte
	hasher := newAddressHasher(testDeployer, testInitcodeHash.Bytes(), salt[:24])
	b.ReportAllocs()
	for i := 0; b.Loop(); i++ {
		_ = hasher.address(uint64(i))
	}
}

func BenchmarkMatcherPrefix(b *testing.B) {
	m, err := newMatcher("0xdead")
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	for b.Loop() {
		if !m(testAddress) {
			b.Fatal("expected match")
		}
	}
}

func BenchmarkMatcherSuffix(b *testing.B) {
	m, err := newMatcher("*0000")
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	for b.Loop() {
		if !m(testAddress) {
			b.Fatal("expected match")
		}
	}
}

func BenchmarkMatcherGlob(b *testing.B) {
	m, err := newMatcher("*beef*")
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	for b.Loop() {
		if !m(testAddress) {
			b.Fatal("expected match")
		}
	}
}
